import { useAttackStore } from "../store/attack-store";
import type { DatasetKey } from "../types/attack";

const TABS: Array<{ key: DatasetKey; label: string }> = [
  { key: "enterprise", label: "Enterprise" },
  { key: "mobile", label: "Mobile" },
  { key: "ics", label: "ICS" },
];

export function DatasetTabs() {
  const currentDataset = useAttackStore((s) => s.currentDataset);
  const setCurrentDataset = useAttackStore((s) => s.setCurrentDataset);
  const datasets = useAttackStore((s) => s.datasets);

  return (
    <div className="tabs">
      {TABS.map((tab) => {
        const loaded = Boolean(datasets[tab.key]);
        return (
          <button
            key={tab.key}
            className={tab.key === currentDataset ? "tab active" : "tab"}
            onClick={() => setCurrentDataset(tab.key)}
            disabled={!loaded}
            type="button"
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
