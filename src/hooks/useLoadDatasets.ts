import { useEffect } from "react";
import { parseAttackBundle } from "../lib/attack-parser";
import { useAttackStore } from "../store/attack-store";
import type { DatasetKey } from "../types/attack";

const DATASET_FILES: Record<DatasetKey, string> = {
  enterprise: "/data/enterprise-attack.json",
  mobile: "/data/mobile-attack.json",
  ics: "/data/ics-attack.json",
};

export function useLoadDatasets() {
  const setDataset = useAttackStore((s) => s.setDataset);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      for (const [key, path] of Object.entries(DATASET_FILES) as Array<
        [DatasetKey, string]
      >) {
        const response = await fetch(path);
        const json = await response.json();
        const parsed = parseAttackBundle(key, json);
        if (!cancelled) {
          setDataset(key, parsed);
        }
      }
    }

    load().catch((error) => {
      console.error("Failed to load ATT&CK datasets:", error);
    });

    return () => {
      cancelled = true;
    };
  }, [setDataset]);
}
