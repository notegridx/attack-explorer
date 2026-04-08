import { useEffect } from "react";
import { parseAttackBundle } from "../lib/attack-parser";
import { useAttackStore } from "../store/attack-store";
import type { DatasetKey } from "../types/attack";

const R2_BASE_URL = "https://static.notegridx.dev";

const DATASET_FILES: Record<DatasetKey, string> = {
  enterprise: `${R2_BASE_URL}/enterprise-attack.json`,
  mobile: `${R2_BASE_URL}/mobile-attack.json`,
  ics: `${R2_BASE_URL}/ics-attack.json`,
};

export function useLoadDatasets(enabled = true) {
  const currentDataset = useAttackStore((s) => s.currentDataset);
  const setDataset = useAttackStore((s) => s.setDataset);
  const setDatasetLoadState = useAttackStore((s) => s.setDatasetLoadState);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    async function loadDataset(key: DatasetKey) {
      const state = useAttackStore.getState();

      if (state.datasets[key]) return;
      if (state.datasetLoadState[key] === "loading") return;
      if (state.datasetLoadState[key] === "loaded") return;

      try {
        setDatasetLoadState(key, "loading");

        const response = await fetch(DATASET_FILES[key]);
        if (!response.ok) {
          throw new Error(`Failed to fetch ${key} dataset: ${response.status}`);
        }

        const bundle = await response.json();
        const parsed = parseAttackBundle(key, bundle);
        setDataset(key, parsed);
      } catch (error) {
        console.error(error);
        setDatasetLoadState(key, "error");
      }
    }

    loadDataset(currentDataset);
  }, [currentDataset, enabled, setDataset, setDatasetLoadState]);
}
