import { create } from "zustand";
import type { DatasetKey, ParsedDataset, StixObject } from "../types/attack";

type AttackStore = {
  currentDataset: DatasetKey;
  datasets: Partial<Record<DatasetKey, ParsedDataset>>;
  datasetLoadState: Record<DatasetKey, "idle" | "loading" | "loaded" | "error">;
  selectedTechniqueId: Partial<Record<DatasetKey, string | null>>;
  searchText: string;

  setCurrentDataset: (key: DatasetKey) => void;
  setDataset: (key: DatasetKey, data: ParsedDataset) => void;
  setDatasetLoadState: (
    key: DatasetKey,
    state: "idle" | "loading" | "loaded" | "error",
  ) => void;
  setSelectedTechniqueId: (dataset: DatasetKey, id: string | null) => void;
  setSearchText: (value: string) => void;

  getCurrentDataset: () => ParsedDataset | undefined;
  getSelectedTechnique: () => StixObject | undefined;
};

export const useAttackStore = create<AttackStore>((set, get) => ({
  currentDataset: "enterprise",
  datasets: {},
  datasetLoadState: {
    enterprise: "idle",
    mobile: "idle",
    ics: "idle",
  },
  selectedTechniqueId: {},
  searchText: "",

  setCurrentDataset: (key) => set({ currentDataset: key }),

  setDataset: (key, data) =>
    set((state) => {
      const alreadySelected = state.selectedTechniqueId[key];
      const firstTechniqueId = data.techniques[0]?.id ?? null;

      return {
        datasets: {
          ...state.datasets,
          [key]: data,
        },
        datasetLoadState: {
          ...state.datasetLoadState,
          [key]: "loaded",
        },
        selectedTechniqueId: {
          ...state.selectedTechniqueId,
          [key]: alreadySelected ?? firstTechniqueId,
        },
      };
    }),

  setDatasetLoadState: (key, loadState) =>
    set((state) => ({
      datasetLoadState: {
        ...state.datasetLoadState,
        [key]: loadState,
      },
    })),

  setSelectedTechniqueId: (dataset, id) =>
    set((state) => ({
      selectedTechniqueId: {
        ...state.selectedTechniqueId,
        [dataset]: id,
      },
    })),

  setSearchText: (value) => set({ searchText: value }),

  getCurrentDataset: () => {
    const state = get();
    return state.datasets[state.currentDataset];
  },

  getSelectedTechnique: () => {
    const state = get();
    const dataset = state.datasets[state.currentDataset];
    const selectedId = state.selectedTechniqueId[state.currentDataset];
    if (!dataset || !selectedId) return undefined;
    return dataset.objectsById[selectedId];
  },
}));
