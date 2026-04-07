import { useEffect, useRef, useState } from "react";
import { getExternalId } from "../lib/attack-parser";
import { useAttackStore } from "../store/attack-store";
import type { Relationship, StixObject } from "../types/attack";

type RelatedItem = {
  rel: Relationship;
  obj?: StixObject;
  objectId: string;
};

type NavigationEntry = {
  rootTechniqueId: string;
  objectId: string;
};

type SelectedObjectState = {
  rootTechniqueId: string;
  objectId: string;
} | null;

type BreadcrumbItem = {
  id: string;
  label: string;
  typeLabel?: string;
  isCurrent: boolean;
};

type ExternalReference = {
  source_name?: string;
  url?: string;
  external_id?: string;
  description?: string;
};

function groupByRelationshipType(items: RelatedItem[]) {
  return items.reduce<Record<string, RelatedItem[]>>((acc, item) => {
    const key = item.rel.relationship_type || "unknown";
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {});
}

function renderObjectLabel(obj?: StixObject, fallbackId?: string) {
  if (!obj) return fallbackId ?? "(unknown)";
  return obj.name ?? obj.id;
}

function renderObjectType(obj?: StixObject) {
  return obj?.type ?? "unknown";
}

function renderObjectExternalId(obj?: StixObject) {
  return obj ? getExternalId(obj) : undefined;
}

function getExternalReferences(obj: StixObject): ExternalReference[] {
  const refs = (obj.external_references ?? []) as ExternalReference[];
  return refs.filter((ref) =>
    Boolean(ref.url || ref.external_id || ref.source_name),
  );
}

function buildReferenceLabel(ref: ExternalReference) {
  if (ref.external_id && ref.source_name) {
    return `${ref.external_id} · ${ref.source_name}`;
  }
  if (ref.external_id) {
    return ref.external_id;
  }
  if (ref.source_name) {
    return ref.source_name;
  }
  return "Reference";
}

function buildBreadcrumbs(
  datasetObjectsById: Record<string, StixObject>,
  selectedTechnique: StixObject,
  detailObject: StixObject,
  effectiveHistory: NavigationEntry[],
): BreadcrumbItem[] {
  const pathIds = [
    selectedTechnique.id,
    ...effectiveHistory.map((entry) => entry.objectId),
  ];

  if (pathIds[pathIds.length - 1] !== detailObject.id) {
    pathIds.push(detailObject.id);
  }

  const uniquePathIds = pathIds.filter(
    (id, index) => pathIds.indexOf(id) === index,
  );

  return uniquePathIds.map((id, index) => {
    const obj = datasetObjectsById[id];
    const label = obj?.name ?? obj?.id ?? id;

    return {
      id,
      label,
      typeLabel: obj?.type,
      isCurrent: index === uniquePathIds.length - 1,
    };
  });
}

function RelatedGroupSection({
  title,
  groupedItems,
  activeObjectId,
  onOpenObject,
}: {
  title: string;
  groupedItems: Record<string, RelatedItem[]>;
  activeObjectId?: string;
  onOpenObject: (objectId: string) => void;
}) {
  const entries = Object.entries(groupedItems);
  const totalCount = entries.reduce((sum, [, items]) => sum + items.length, 0);

  if (entries.length === 0) return null;

  return (
    <section className="related-section">
      <div className="related-section-header">
        <h3>{title}</h3>
        <span className="related-section-count">{totalCount}</span>
      </div>

      {entries.map(([relationshipType, items]) => {
        const relationshipCount = items.length;

        return (
          <div key={relationshipType} className="related-group-block">
            <div className="related-group-header">
              <h4 className="related-group-title">{relationshipType}</h4>
              <span className="related-group-count">{relationshipCount}</span>
            </div>

            <div className="related-list">
              {items.map(({ rel, obj, objectId }) => {
                const active = activeObjectId === objectId;
                const externalId = renderObjectExternalId(obj);

                return (
                  <button
                    key={rel.id}
                    type="button"
                    className={active ? "related-card active" : "related-card"}
                    onClick={() => onOpenObject(objectId)}
                  >
                    <div className="related-card-topline">
                      <span className="related-type">
                        {renderObjectType(obj)}
                      </span>
                      {externalId && (
                        <span className="related-external-id">
                          {externalId}
                        </span>
                      )}
                    </div>

                    <div className="related-name">
                      {renderObjectLabel(obj, objectId)}
                    </div>

                    <div className="related-id">{obj?.id ?? objectId}</div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}

export function TechniqueDetail() {
  const dataset = useAttackStore((s) => s.getCurrentDataset());
  const selectedTechnique = useAttackStore((s) => s.getSelectedTechnique());

  const [selectedObject, setSelectedObject] =
    useState<SelectedObjectState>(null);
  const [navigationHistory, setNavigationHistory] = useState<NavigationEntry[]>(
    [],
  );

  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (panelRef.current) {
      panelRef.current.scrollTop = 0;
    }
  }, [selectedTechnique?.id, selectedObject?.objectId]);

  if (!dataset) {
    return <div className="panel">Loading...</div>;
  }

  if (!selectedTechnique) {
    return <div className="panel">No technique selected.</div>;
  }

  const rootTechniqueId = selectedTechnique.id;

  const effectiveSelectedObjectId =
    selectedObject &&
    selectedObject.rootTechniqueId === rootTechniqueId &&
    dataset.objectsById[selectedObject.objectId]
      ? selectedObject.objectId
      : null;

  const effectiveHistory = navigationHistory.filter(
    (entry) =>
      entry.rootTechniqueId === rootTechniqueId &&
      Boolean(
        dataset.objectsById[entry.objectId] ||
        entry.objectId === rootTechniqueId,
      ),
  );

  const detailObject =
    effectiveSelectedObjectId != null
      ? dataset.objectsById[effectiveSelectedObjectId]
      : selectedTechnique;

  if (!detailObject) {
    return <div className="panel">No object selected.</div>;
  }

  const detailObjectId = detailObject.id;

  const outgoingItems: RelatedItem[] = (
    dataset.relationshipsBySource[detailObjectId] ?? []
  ).map((rel) => ({
    rel,
    obj: dataset.objectsById[rel.target_ref],
    objectId: rel.target_ref,
  }));

  const incomingItems: RelatedItem[] = (
    dataset.relationshipsByTarget[detailObjectId] ?? []
  ).map((rel) => ({
    rel,
    obj: dataset.objectsById[rel.source_ref],
    objectId: rel.source_ref,
  }));

  function openObject(objectId: string) {
    if (objectId === detailObjectId) return;

    setNavigationHistory((prev) => [
      ...prev.filter((entry) => entry.rootTechniqueId === rootTechniqueId),
      {
        rootTechniqueId,
        objectId: detailObjectId,
      },
    ]);

    setSelectedObject({
      rootTechniqueId,
      objectId,
    });
  }

  function goRoot() {
    setSelectedObject(null);
    setNavigationHistory([]);
  }

  function jumpToBreadcrumb(objectId: string) {
    if (objectId === rootTechniqueId) {
      goRoot();
      return;
    }

    const index = effectiveHistory.findIndex(
      (entry) => entry.objectId === objectId,
    );
    if (index === -1) {
      setSelectedObject({
        rootTechniqueId,
        objectId,
      });
      return;
    }

    setNavigationHistory(effectiveHistory.slice(0, index));
    setSelectedObject({
      rootTechniqueId,
      objectId,
    });
  }

  const breadcrumbs = buildBreadcrumbs(
    dataset.objectsById,
    selectedTechnique,
    detailObject,
    effectiveHistory,
  );

  const externalId = getExternalId(detailObject);
  const groupedOutgoing = groupByRelationshipType(outgoingItems);
  const groupedIncoming = groupByRelationshipType(incomingItems);
  const references = getExternalReferences(detailObject);

  const tactics =
    detailObject.type === "attack-pattern"
      ? (detailObject.kill_chain_phases
          ?.map((phase) => phase.phase_name)
          .filter(Boolean) ?? [])
      : [];

  const platforms = detailObject.x_mitre_platforms ?? [];

  return (
    <div ref={panelRef} className="panel detail-panel">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        {breadcrumbs.map((item, index) => (
          <span key={item.id} className="breadcrumb-item">
            {item.isCurrent ? (
              <span className="breadcrumb-current-wrap">
                <span className="breadcrumb-current">{item.label}</span>
                {item.typeLabel && (
                  <span className="breadcrumb-type">{item.typeLabel}</span>
                )}
              </span>
            ) : (
              <button
                type="button"
                className="breadcrumb-link"
                onClick={() => jumpToBreadcrumb(item.id)}
              >
                <span>{item.label}</span>
                {item.typeLabel && (
                  <span className="breadcrumb-type">{item.typeLabel}</span>
                )}
              </button>
            )}

            {index < breadcrumbs.length - 1 && (
              <span className="breadcrumb-separator" aria-hidden="true">
                /
              </span>
            )}
          </span>
        ))}
      </nav>

      <div className="detail-header">
        <div className="detail-id">
          {externalId ?? detailObject.type ?? "Object"}
        </div>
        <h2>{detailObject.name ?? "(no name)"}</h2>
        <p className="description">
          {detailObject.description ?? "No description available."}
        </p>
      </div>

      {references.length > 0 && (
        <section className="reference-section">
          <h3 className="reference-title">References</h3>
          <div className="reference-list">
            {references.map((ref, index) => {
              const label = buildReferenceLabel(ref);

              if (ref.url) {
                return (
                  <a
                    key={`${ref.source_name ?? "ref"}-${index}`}
                    className="reference-link"
                    href={ref.url}
                    target="_blank"
                    rel="noreferrer"
                    title={ref.description ?? label}
                  >
                    {label}
                  </a>
                );
              }

              return (
                <span
                  key={`${ref.source_name ?? "ref"}-${index}`}
                  className="reference-pill"
                  title={ref.description ?? label}
                >
                  {label}
                </span>
              );
            })}
          </div>
        </section>
      )}

      <div className="badges">
        <span className="badge subtle">{detailObject.type}</span>

        {tactics.map((tactic) => (
          <span key={tactic} className="badge">
            tactic: {tactic}
          </span>
        ))}

        {platforms.map((platform) => (
          <span key={platform} className="badge subtle">
            {platform}
          </span>
        ))}
      </div>

      <RelatedGroupSection
        title="Outgoing relationships"
        groupedItems={groupedOutgoing}
        activeObjectId={detailObject.id}
        onOpenObject={openObject}
      />
      <RelatedGroupSection
        title="Incoming relationships"
        groupedItems={groupedIncoming}
        activeObjectId={detailObject.id}
        onOpenObject={openObject}
      />
    </div>
  );
}
