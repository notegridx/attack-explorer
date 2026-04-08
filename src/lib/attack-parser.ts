import type {
  DatasetKey,
  ParsedDataset,
  Relationship,
  StixObject,
} from "../types/attack";

function getCollectionInfo(objects: StixObject[]) {
  const collection = objects.find((o) => o.type === "x-mitre-collection");
  return {
    label: (collection?.name as string | undefined) ?? "ATT&CK",
    version: collection?.x_mitre_version as string | undefined,
  };
}

export function getExternalId(obj: StixObject): string | undefined {
  return obj.external_references?.find((ref) => ref.external_id)?.external_id;
}

export function isRevokedOrDeprecated(obj?: StixObject): boolean {
  if (!obj) {
    return true;
  }

  return obj.revoked === true || obj.x_mitre_deprecated === true;
}

export function isActiveAttackObject(obj?: StixObject): obj is StixObject {
  return Boolean(obj) && !isRevokedOrDeprecated(obj);
}

export function parseAttackBundle(
  key: DatasetKey,
  bundle: { objects?: StixObject[] },
): ParsedDataset {
  const objects = bundle.objects ?? [];

  const objectsById: Record<string, StixObject> = {};
  const relationships: Relationship[] = [];
  const relationshipsBySource: Record<string, Relationship[]> = {};
  const relationshipsByTarget: Record<string, Relationship[]> = {};

  for (const obj of objects) {
    objectsById[obj.id] = obj;
  }

  for (const obj of objects) {
    if (obj.type !== "relationship") {
      continue;
    }

    const rel = obj as Relationship;
    const sourceObject = objectsById[rel.source_ref];
    const targetObject = objectsById[rel.target_ref];

    if (
      !isActiveAttackObject(rel) ||
      !isActiveAttackObject(sourceObject) ||
      !isActiveAttackObject(targetObject)
    ) {
      continue;
    }

    relationships.push(rel);

    if (!relationshipsBySource[rel.source_ref]) {
      relationshipsBySource[rel.source_ref] = [];
    }
    relationshipsBySource[rel.source_ref].push(rel);

    if (!relationshipsByTarget[rel.target_ref]) {
      relationshipsByTarget[rel.target_ref] = [];
    }
    relationshipsByTarget[rel.target_ref].push(rel);
  }

  const techniques = objects
    .filter((o) => o.type === "attack-pattern")
    .filter(isActiveAttackObject)
    .sort((a, b) => {
      const aId = getExternalId(a) ?? "";
      const bId = getExternalId(b) ?? "";
      return (
        aId.localeCompare(bId) || (a.name ?? "").localeCompare(b.name ?? "")
      );
    });

  const { label, version } = getCollectionInfo(objects);

  return {
    key,
    label,
    version,
    objects,
    objectsById,
    relationships,
    relationshipsBySource,
    relationshipsByTarget,
    techniques,
  };
}