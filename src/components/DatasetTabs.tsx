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
  const datasetLoadState = useAttackStore((s) => s.datasetLoadState);

  return (
    <div className="tabs">
      {TABS.map((tab) => {
        const loadState = datasetLoadState[tab.key];
        const isCurrent = tab.key === currentDataset;

        return (
          <button
            key={tab.key}
            className={isCurrent ? "tab active" : "tab"}
            onClick={() => setCurrentDataset(tab.key)}
            type="button"
          >
            {tab.label}
            {loadState === "loading" ? " …" : ""}
          </button>
        );
      })}
    </div>
  );
}
