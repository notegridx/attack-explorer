import { useEffect, useMemo, useState } from "react";
import {
  getExternalId,
  isActiveAttackObject,
} from "../lib/attack-parser";
import { useAttackStore } from "../store/attack-store";
import type { Relationship, StixObject } from "../types/attack";

type TechniqueTreeNode = {
  technique: StixObject;
  subtechniques: StixObject[];
};

type TacticSection = {
  tactic: string;
  items: TechniqueTreeNode[];
};

const TACTIC_ORDER = [
  "reconnaissance",
  "resource-development",
  "initial-access",
  "execution",
  "persistence",
  "privilege-escalation",
  "defense-evasion",
  "credential-access",
  "discovery",
  "lateral-movement",
  "collection",
  "command-and-control",
  "exfiltration",
  "impact",
] as const;

function matchesQuery(technique: StixObject, q: string) {
  const externalId = getExternalId(technique)?.toLowerCase() ?? "";
  const name = technique.name?.toLowerCase() ?? "";
  const description = technique.description?.toLowerCase() ?? "";

  return (
    externalId.includes(q) || name.includes(q) || description.includes(q)
  );
}

function getTacticNames(technique: StixObject): string[] {
  const phases =
    technique.kill_chain_phases
      ?.map((phase) => phase.phase_name?.trim())
      .filter((phase): phase is string => Boolean(phase)) ?? [];

  return Array.from(new Set(phases));
}

function formatTacticLabel(tactic: string) {
  return tactic
    .split("-")
    .map((part) =>
      part.length > 0 ? part[0].toUpperCase() + part.slice(1) : part,
    )
    .join(" ");
}

function compareTactics(a: string, b: string) {
  const aIndex = TACTIC_ORDER.indexOf(a as (typeof TACTIC_ORDER)[number]);
  const bIndex = TACTIC_ORDER.indexOf(b as (typeof TACTIC_ORDER)[number]);

  const normalizedAIndex = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
  const normalizedBIndex = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;

  if (normalizedAIndex !== normalizedBIndex) {
    return normalizedAIndex - normalizedBIndex;
  }

  return a.localeCompare(b);
}

export function TechniqueList() {
  const dataset = useAttackStore((s) => s.getCurrentDataset());
  const currentDataset = useAttackStore((s) => s.currentDataset);
  const selectedTechniqueId = useAttackStore(
    (s) => s.selectedTechniqueId[s.currentDataset],
  );
  const setSelectedTechniqueId = useAttackStore(
    (s) => s.setSelectedTechniqueId,
  );
  const searchText = useAttackStore((s) => s.searchText);
  const setSearchText = useAttackStore((s) => s.setSearchText);

  const [collapsedTactics, setCollapsedTactics] = useState<
    Record<string, boolean>
  >({});

  const q = searchText.trim().toLowerCase();

  const techniqueTree = useMemo<TechniqueTreeNode[]>(() => {
    if (!dataset) return [];

    const activeTechniques = dataset.techniques.filter(isActiveAttackObject);

    const parentByChildId = new Map<string, string>();
    const childrenByParentId = new Map<string, StixObject[]>();

    for (const technique of activeTechniques) {
      const outgoing = dataset.relationshipsBySource[technique.id] ?? [];
      const subtechniqueRel = outgoing.find((rel: Relationship) => {
        if (rel.relationship_type !== "subtechnique-of") {
          return false;
        }

        const parentObject = dataset.objectsById[rel.target_ref];
        return (
          parentObject?.type === "attack-pattern" &&
          isActiveAttackObject(parentObject)
        );
      });

      if (subtechniqueRel) {
        parentByChildId.set(technique.id, subtechniqueRel.target_ref);
      }
    }

    for (const technique of activeTechniques) {
      const parentId = parentByChildId.get(technique.id);
      if (!parentId) continue;

      const siblings = childrenByParentId.get(parentId) ?? [];
      siblings.push(technique);
      childrenByParentId.set(parentId, siblings);
    }

    const sortedTechniques = [...activeTechniques].sort((a, b) => {
      const aId = getExternalId(a) ?? "";
      const bId = getExternalId(b) ?? "";
      return (
        aId.localeCompare(bId) || (a.name ?? "").localeCompare(b.name ?? "")
      );
    });

    const rootTechniques = sortedTechniques.filter(
      (technique) => !parentByChildId.has(technique.id),
    );

    return rootTechniques.map((rootTechnique) => {
      const subtechniques = [
        ...(childrenByParentId.get(rootTechnique.id) ?? []),
      ].sort((a, b) => {
        const aId = getExternalId(a) ?? "";
        const bId = getExternalId(b) ?? "";
        return (
          aId.localeCompare(bId) || (a.name ?? "").localeCompare(b.name ?? "")
        );
      });

      return {
        technique: rootTechnique,
        subtechniques,
      };
    });
  }, [dataset]);

  const filteredTechniqueTree = useMemo<TechniqueTreeNode[]>(() => {
    if (!dataset) return [];
    if (!q) return techniqueTree;

    return techniqueTree
      .map(({ technique, subtechniques }) => {
        const rootMatched = matchesQuery(technique, q);
        const matchedSubtechniques = subtechniques.filter((subtechnique) =>
          matchesQuery(subtechnique, q),
        );

        if (rootMatched) {
          return {
            technique,
            subtechniques,
          };
        }

        if (matchedSubtechniques.length > 0) {
          return {
            technique,
            subtechniques: matchedSubtechniques,
          };
        }

        return null;
      })
      .filter((node): node is TechniqueTreeNode => node !== null);
  }, [dataset, q, techniqueTree]);

  const tacticSections = useMemo<TacticSection[]>(() => {
    if (!dataset) return [];

    const sectionMap = new Map<string, TechniqueTreeNode[]>();

    for (const node of filteredTechniqueTree) {
      const tacticNames = getTacticNames(node.technique);
      const effectiveTactics =
        tacticNames.length > 0 ? tacticNames : ["no-tactic"];

      for (const tactic of effectiveTactics) {
        const items = sectionMap.get(tactic) ?? [];
        items.push(node);
        sectionMap.set(tactic, items);
      }
    }

    return Array.from(sectionMap.entries())
      .sort(([a], [b]) => compareTactics(a, b))
      .map(([tactic, items]) => ({
        tactic,
        items: items.sort((a, b) => {
          const aId = getExternalId(a.technique) ?? "";
          const bId = getExternalId(b.technique) ?? "";
          return (
            aId.localeCompare(bId) ||
            (a.technique.name ?? "").localeCompare(b.technique.name ?? "")
          );
        }),
      }));
  }, [dataset, filteredTechniqueTree]);

  useEffect(() => {
    if (q) {
      const expandedState = tacticSections.reduce<Record<string, boolean>>(
        (acc, section) => {
          acc[section.tactic] = false;
          return acc;
        },
        {},
      );
      setCollapsedTactics(expandedState);
      return;
    }

    setCollapsedTactics((prev) => {
      const next = { ...prev };

      for (const section of tacticSections) {
        if (!(section.tactic in next)) {
          next[section.tactic] = false;
        }
      }

      for (const tactic of Object.keys(next)) {
        if (!tacticSections.some((section) => section.tactic === tactic)) {
          delete next[tactic];
        }
      }

      return next;
    });
  }, [q, tacticSections]);

  const visibleItemCount = useMemo(() => {
    return filteredTechniqueTree.reduce(
      (sum, node) => sum + 1 + node.subtechniques.length,
      0,
    );
  }, [filteredTechniqueTree]);

  function toggleTactic(tactic: string) {
    setCollapsedTactics((prev) => ({
      ...prev,
      [tactic]: !prev[tactic],
    }));
  }

  if (!dataset) {
    return <div className="panel">Loading dataset...</div>;
  }

  return (
    <div className="panel left-panel">
      <div className="panel-header">
        <h2>Techniques</h2>
        <input
          className="search-input"
          type="text"
          placeholder="Search techniques..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <div className="meta">
          {dataset.label}
          {dataset.version ? ` v${dataset.version}` : ""} · {visibleItemCount}{" "}
          items
        </div>
      </div>

      <div className="list">
        {tacticSections.map(({ tactic, items }) => {
          const isCollapsed = collapsedTactics[tactic] ?? false;

          return (
            <section key={tactic} className="tactic-section">
              <button
                type="button"
                className="tactic-section-header tactic-toggle"
                onClick={() => toggleTactic(tactic)}
                aria-expanded={!isCollapsed}
              >
                <div className="tactic-section-heading">
                  <span className="tactic-toggle-icon" aria-hidden="true">
                    {isCollapsed ? "▸" : "▾"}
                  </span>
                  <h3 className="tactic-section-title">
                    {formatTacticLabel(tactic)}
                  </h3>
                </div>
                <span className="tactic-section-count">{items.length}</span>
              </button>

              {!isCollapsed && (
                <div className="tactic-section-list">
                  {items.map(({ technique, subtechniques }) => {
                    const techniqueExternalId = getExternalId(technique);
                    const techniqueActive = technique.id === selectedTechniqueId;

                    return (
                      <div key={technique.id} className="technique-tree-group">
                        <button
                          type="button"
                          className={
                            techniqueActive ? "list-item active" : "list-item"
                          }
                          onClick={() =>
                            setSelectedTechniqueId(currentDataset, technique.id)
                          }
                        >
                          <div className="list-item-id">
                            {techniqueExternalId ?? "-"}
                          </div>
                          <div className="list-item-name">
                            {technique.name ?? "(no name)"}
                          </div>
                        </button>

                        {subtechniques.length > 0 && (
                          <div className="subtechnique-list">
                            {subtechniques.map((subtechnique) => {
                              const subtechniqueExternalId =
                                getExternalId(subtechnique);
                              const subtechniqueActive =
                                subtechnique.id === selectedTechniqueId;

                              return (
                                <button
                                  key={subtechnique.id}
                                  type="button"
                                  className={
                                    subtechniqueActive
                                      ? "list-item subtechnique-item active"
                                      : "list-item subtechnique-item"
                                  }
                                  onClick={() =>
                                    setSelectedTechniqueId(
                                      currentDataset,
                                      subtechnique.id,
                                    )
                                  }
                                >
                                  <div className="list-item-id">
                                    {subtechniqueExternalId ?? "-"}
                                  </div>
                                  <div className="list-item-name">
                                    {subtechnique.name ?? "(no name)"}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}