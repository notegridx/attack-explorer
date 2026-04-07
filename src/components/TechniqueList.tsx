import { useMemo } from "react";
import { getExternalId } from "../lib/attack-parser";
import { useAttackStore } from "../store/attack-store";

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

  const filteredTechniques = useMemo(() => {
    if (!dataset) return [];

    const q = searchText.trim().toLowerCase();
    if (!q) return dataset.techniques;

    return dataset.techniques.filter((technique) => {
      const externalId = getExternalId(technique)?.toLowerCase() ?? "";
      const name = technique.name?.toLowerCase() ?? "";
      const description = technique.description?.toLowerCase() ?? "";
      return (
        externalId.includes(q) || name.includes(q) || description.includes(q)
      );
    });
  }, [dataset, searchText]);

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
          {dataset.version ? ` v${dataset.version}` : ""} ·{" "}
          {filteredTechniques.length} items
        </div>
      </div>

      <div className="list">
        {filteredTechniques.map((technique) => {
          const externalId = getExternalId(technique);
          const active = technique.id === selectedTechniqueId;
          return (
            <button
              key={technique.id}
              type="button"
              className={active ? "list-item active" : "list-item"}
              onClick={() =>
                setSelectedTechniqueId(currentDataset, technique.id)
              }
            >
              <div className="list-item-id">{externalId ?? "-"}</div>
              <div className="list-item-name">
                {technique.name ?? "(no name)"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
