import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import ReactMarkdown from "react-markdown";
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

function normalizeReferenceKey(value: string) {
  return value.trim().toLowerCase();
}

function extractCitationName(citationText: string): string | null {
  const match = citationText.match(/^\(Citation:\s*([^)]+)\)$/i);
  return match ? match[1].trim() : null;
}

function buildReferenceLookup(references: ExternalReference[]) {
  const lookup = new Map<string, ExternalReference>();

  references.forEach((ref) => {
    if (ref.source_name) {
      lookup.set(normalizeReferenceKey(ref.source_name), ref);
    }
    if (ref.external_id) {
      lookup.set(normalizeReferenceKey(ref.external_id), ref);
    }
  });

  return lookup;
}

function extractAttackExternalIdFromUrl(href: string): string | null {
  try {
    const url = new URL(href);
    const host = url.hostname.toLowerCase();

    if (host !== "attack.mitre.org" && host !== "www.attack.mitre.org") {
      return null;
    }

    const match = url.pathname.match(
      /^\/techniques\/(T\d{4}(?:\/\d{3})?)\/?$/i,
    );

    if (!match) {
      return null;
    }

    return match[1].replace("/", ".");
  } catch {
    return null;
  }
}

function isSelfMitreAttackReference(
  ref: ExternalReference,
  detailObjectExternalId?: string,
) {
  if (!detailObjectExternalId) {
    return false;
  }

  if (ref.source_name !== "mitre-attack") {
    return false;
  }

  const targetExternalId =
    ref.url != null ? extractAttackExternalIdFromUrl(ref.url) : null;

  return (
    ref.external_id === detailObjectExternalId ||
    targetExternalId === detailObjectExternalId
  );
}

function findTechniqueObjectIdByExternalId(
  techniques: StixObject[],
  externalId: string,
): string | null {
  const normalized = externalId.toUpperCase();

  const found = techniques.find(
    (technique) => getExternalId(technique)?.toUpperCase() === normalized,
  );

  return found?.id ?? null;
}

function decorateCitationText(
  text: string,
  resolveReference: (citationName: string) => ExternalReference | undefined,
  onOpenInternalTechniqueLink: (externalId: string) => void,
): ReactNode[] {
  const regex = /(\(Citation:\s*[^)]+\))/g;
  const parts = text.split(regex);

  return parts
    .filter((part) => part.length > 0)
    .map((part, index) => {
      if (!part.match(regex)) {
        return part;
      }

      const citationName = extractCitationName(part);
      const ref = citationName ? resolveReference(citationName) : undefined;
      const label = citationName ?? part;
      const targetExternalId =
        ref?.url != null ? extractAttackExternalIdFromUrl(ref.url) : null;

      if (targetExternalId) {
        return (
          <button
            key={`citation-${index}`}
            type="button"
            className="citation-pill"
            onClick={() => onOpenInternalTechniqueLink(targetExternalId)}
            title={ref?.description ?? `Open ${targetExternalId}`}
          >
            {label}
          </button>
        );
      }

      if (ref?.url) {
        return (
          <a
            key={`citation-${index}`}
            className="citation-pill"
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
          key={`citation-${index}`}
          className="citation-pill muted"
          title={ref?.description ?? label}
        >
          {label}
        </span>
      );
    });
}

function decorateNode(
  node: ReactNode,
  resolveReference: (citationName: string) => ExternalReference | undefined,
  onOpenInternalTechniqueLink: (externalId: string) => void,
): ReactNode {
  if (typeof node === "string") {
    return decorateCitationText(
      node,
      resolveReference,
      onOpenInternalTechniqueLink,
    );
  }

  if (Array.isArray(node)) {
    return node.map((child, index) => (
      <span key={index}>
        {decorateNode(child, resolveReference, onOpenInternalTechniqueLink)}
      </span>
    ));
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    const originalChildren = node.props.children;

    if (originalChildren == null) {
      return node;
    }

    const decoratedChildren = Children.map(originalChildren, (child) =>
      decorateNode(child, resolveReference, onOpenInternalTechniqueLink),
    );

    return cloneElement(node, {
      ...node.props,
      children: decoratedChildren,
    });
  }

  return node;
}

function MarkdownDescription({
  content,
  references,
  onOpenInternalTechniqueLink,
}: {
  content: string;
  references: ExternalReference[];
  onOpenInternalTechniqueLink: (externalId: string) => void;
}) {
  const referenceLookup = useMemo(
    () => buildReferenceLookup(references),
    [references],
  );

  const resolveReference = (citationName: string) =>
    referenceLookup.get(normalizeReferenceKey(citationName));

  return (
    <ReactMarkdown
      components={{
        a: ({ href, children, ...props }) => {
          const targetExternalId =
            href != null ? extractAttackExternalIdFromUrl(href) : null;

          if (targetExternalId) {
            return (
              <button
                type="button"
                className="inline-technique-link"
                onClick={() => onOpenInternalTechniqueLink(targetExternalId)}
                title={`Open ${targetExternalId} in this app`}
              >
                {children}
              </button>
            );
          }

          return (
            <a {...props} href={href} target="_blank" rel="noreferrer">
              {children}
            </a>
          );
        },
        p: ({ children }) => (
          <p>
            {decorateNode(
              children,
              resolveReference,
              onOpenInternalTechniqueLink,
            )}
          </p>
        ),
        li: ({ children }) => (
          <li>
            {decorateNode(
              children,
              resolveReference,
              onOpenInternalTechniqueLink,
            )}
          </li>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
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
  const currentDataset = useAttackStore((s) => s.currentDataset);
  const setSelectedTechniqueId = useAttackStore(
    (s) => s.setSelectedTechniqueId,
  );

  const [selectedObject, setSelectedObject] =
    useState<SelectedObjectState>(null);
  const [navigationHistory, setNavigationHistory] = useState<NavigationEntry[]>(
    [],
  );
  const [sourcesExpanded, setSourcesExpanded] = useState(false);

  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (panelRef.current) {
      panelRef.current.scrollTop = 0;
    }
  }, [selectedTechnique?.id, selectedObject?.objectId]);

  useEffect(() => {
    setSourcesExpanded(false);
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

  const ds = dataset;

function openInternalTechniqueLink(externalId: string) {
  if (!ds) return;

  const targetObjectId = findTechniqueObjectIdByExternalId(
    ds.techniques,
    externalId,
  );

    if (!targetObjectId) return;

    setSelectedTechniqueId(currentDataset, targetObjectId);
    setSelectedObject(null);
    setNavigationHistory([]);
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
  const references = getExternalReferences(detailObject).filter(
    (ref) => !isSelfMitreAttackReference(ref, externalId),
  );

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
        <div className="description">
          <MarkdownDescription
            content={detailObject.description ?? "No description available."}
            references={references}
            onOpenInternalTechniqueLink={openInternalTechniqueLink}
          />
        </div>
      </div>

      {references.length > 0 && (
        <section className="reference-section">
          <button
            type="button"
            className="reference-toggle"
            onClick={() => setSourcesExpanded((prev) => !prev)}
            aria-expanded={sourcesExpanded}
          >
            <span className="reference-toggle-label">
              Sources ({references.length})
            </span>
            <span className="reference-toggle-icon" aria-hidden="true">
              {sourcesExpanded ? "▾" : "▸"}
            </span>
          </button>

          {sourcesExpanded && (
            <div className="reference-list">
              {references.map((ref, index) => {
                const label = buildReferenceLabel(ref);
                const targetExternalId =
                  ref.url != null
                    ? extractAttackExternalIdFromUrl(ref.url)
                    : null;

                if (targetExternalId) {
                  return (
                    <button
                      key={`${ref.source_name ?? "ref"}-${index}`}
                      type="button"
                      className="reference-link"
                      onClick={() => openInternalTechniqueLink(targetExternalId)}
                      title={
                        ref.description ?? `Open ${targetExternalId} in this app`
                      }
                    >
                      {label}
                    </button>
                  );
                }

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
          )}
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