import { useEffect } from "react";
import { parseAttackBundle } from "../lib/attack-parser";
import { useAttackStore } from "../store/attack-store";
import type { DatasetKey } from "../types/attack";

const R2_BASE_URL = "https://pub-128c7382d87542bcb8b91426b05e300f.r2.dev";

const DATASET_FILES: Record<DatasetKey, string> = {
  enterprise: `${R2_BASE_URL}/enterprise-attack.json`,
  mobile: `${R2_BASE_URL}/mobile-attack.json`,
  ics: `${R2_BASE_URL}/ics-attack.json`,
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
