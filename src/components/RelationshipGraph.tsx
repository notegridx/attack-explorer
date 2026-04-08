import { useMemo } from "react";
import { getExternalId, isActiveAttackObject } from "../lib/attack-parser";
import type { ParsedDataset, Relationship, StixObject } from "../types/attack";

type RelationshipGraphProps = {
  dataset: ParsedDataset;
  centerObjectId: string;
  activeObjectId?: string;
  onOpenObject: (objectId: string) => void;
};

type RelatedObjectEntry = {
  objectId: string;
  relationshipType: string;
  direction: "outgoing" | "incoming";
  relationships: Relationship[];
};

type RelationshipGroup = {
  relationshipType: string;
  items: RelatedObjectEntry[];
};

type DirectionSection = {
  direction: "outgoing" | "incoming";
  groups: RelationshipGroup[];
};

function buildGroupedRelationships(
  dataset: ParsedDataset,
  centerObjectId: string,
): {
  sections: DirectionSection[];
  visibleCount: number;
} {
  const outgoing = dataset.relationshipsBySource[centerObjectId] ?? [];
  const incoming = dataset.relationshipsByTarget[centerObjectId] ?? [];

  const outgoingByType = new Map<string, Map<string, Relationship[]>>();
  const incomingByType = new Map<string, Map<string, Relationship[]>>();

  const collectByType = (
    relationships: Relationship[],
    direction: "outgoing" | "incoming",
  ) => {
    const container =
      direction === "outgoing" ? outgoingByType : incomingByType;

    relationships.forEach((rel) => {
      const relatedObjectId =
        direction === "outgoing" ? rel.target_ref : rel.source_ref;
      const relatedObject = dataset.objectsById[relatedObjectId];

      if (!isActiveAttackObject(relatedObject)) return;
      if (relatedObjectId === centerObjectId) return;

      const relationshipType = rel.relationship_type || "unknown";

      if (!container.has(relationshipType)) {
        container.set(relationshipType, new Map<string, Relationship[]>());
      }

      const objectMap = container.get(relationshipType)!;
      if (!objectMap.has(relatedObjectId)) {
        objectMap.set(relatedObjectId, []);
      }

      objectMap.get(relatedObjectId)!.push(rel);
    });
  };

  collectByType(outgoing, "outgoing");
  collectByType(incoming, "incoming");

  let visibleCount = 0;

  const buildSection = (
    direction: "outgoing" | "incoming",
    byType: Map<string, Map<string, Relationship[]>>,
  ): DirectionSection => {
    const groups = Array.from(byType.entries()).map(
      ([relationshipType, objectMap]) => {
        const items: RelatedObjectEntry[] = Array.from(objectMap.entries()).map(
          ([objectId, relationships]) => ({
            objectId,
            relationshipType,
            direction,
            relationships,
          }),
        );

        visibleCount += items.length;

        return {
          relationshipType,
          items,
        };
      },
    );

    return {
      direction,
      groups,
    };
  };

  const sections = [
    buildSection("incoming", incomingByType),
    buildSection("outgoing", outgoingByType),
  ].filter((section) => section.groups.length > 0);

  return { sections, visibleCount };
}

function getObjectTypeClassName(obj?: StixObject) {
  const typeLabel = obj?.type ?? "unknown";
  return `type-${typeLabel.replace(/[^a-z0-9-]/gi, "-").toLowerCase()}`;
}

function renderDirectionLabel(direction: "outgoing" | "incoming") {
  return direction === "outgoing" ? "Outgoing" : "Incoming";
}

function RelationshipSection({
  section,
  dataset,
  activeObjectId,
  onOpenObject,
}: {
  section: DirectionSection;
  dataset: ParsedDataset;
  activeObjectId?: string;
  onOpenObject: (objectId: string) => void;
}) {
  return (
    <div className={`relationship-tree-section ${section.direction}`}>
      <div className="relationship-tree-section-title">
        {renderDirectionLabel(section.direction)}
      </div>

      <div className="relationship-tree-groups">
        {section.groups.map((group) => (
          <div
            key={`${section.direction}-${group.relationshipType}`}
            className="relationship-tree-group"
          >
            <div className="relationship-tree-branch">
              <div className="relationship-tree-type-card">
                <div className="relationship-tree-type-direction">
                  {renderDirectionLabel(section.direction).toUpperCase()}
                </div>
                <div className="relationship-tree-type-name">
                  {group.relationshipType}
                </div>
              </div>

              <div className="relationship-tree-items">
                {group.items.map((item) => {
                  const obj = dataset.objectsById[item.objectId];
                  if (!isActiveAttackObject(obj)) return null;

                  const externalId = getExternalId(obj);
                  const isActive = item.objectId === activeObjectId;

                  return (
                    <div
                      key={`${section.direction}-${group.relationshipType}-${item.objectId}`}
                      className="relationship-tree-item-row"
                    >
                      <div className="relationship-tree-item-connector" />
                      <button
                        type="button"
                        className={[
                          "relationship-tree-item-card",
                          "related-card",
                          getObjectTypeClassName(obj),
                          isActive ? "active" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => onOpenObject(item.objectId)}
                      >
                        <div className="related-card-topline">
                          <span className="related-type">{obj.type}</span>
                          {externalId && (
                            <span className="related-external-id">
                              {externalId}
                            </span>
                          )}
                        </div>
                        <div className="related-name">{obj.name ?? obj.id}</div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RelationshipGraph({
  dataset,
  centerObjectId,
  activeObjectId,
  onOpenObject,
}: RelationshipGraphProps) {
  const centerObject = dataset.objectsById[centerObjectId];

  const { sections, visibleCount } = useMemo(
    () => buildGroupedRelationships(dataset, centerObjectId),
    [dataset, centerObjectId],
  );

  const incomingSection = sections.find(
    (section) => section.direction === "incoming",
  );
  const outgoingSection = sections.find(
    (section) => section.direction === "outgoing",
  );

  if (!isActiveAttackObject(centerObject) || visibleCount === 0) {
    return null;
  }

  return (
    <section className="related-section">
      <div className="related-section-header">
        <h3>Relationship tree</h3>
        <span className="related-section-count">{visibleCount}</span>
      </div>

      <div className="relationship-tree">
        {incomingSection && (
          <RelationshipSection
            section={incomingSection}
            dataset={dataset}
            activeObjectId={activeObjectId}
            onOpenObject={onOpenObject}
          />
        )}

        <div className="relationship-tree-root-wrap">
          <div
            className={[
              "relationship-tree-root",
              "attack-graph-node",
              "center",
              getObjectTypeClassName(centerObject),
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="attack-graph-node-top">
              <span className="attack-graph-node-type">
                {centerObject.type}
              </span>
              {getExternalId(centerObject) && (
                <span className="attack-graph-node-id">
                  {getExternalId(centerObject)}
                </span>
              )}
            </div>
            <div className="attack-graph-node-label">
              {centerObject.name ?? centerObject.id}
            </div>
          </div>
        </div>

        {outgoingSection && (
          <RelationshipSection
            section={outgoingSection}
            dataset={dataset}
            activeObjectId={activeObjectId}
            onOpenObject={onOpenObject}
          />
        )}
      </div>
    </section>
  );
}