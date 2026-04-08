import { create } from "zustand";
import type { DatasetKey, ParsedDataset, StixObject } from "../types/attack";

export type NavigationEntry = {
  rootTechniqueId: string;
  objectId: string;
};

type AttackStore = {
  currentDataset: DatasetKey;
  datasets: Partial<Record<DatasetKey, ParsedDataset>>;
  datasetLoadState: Record<DatasetKey, "idle" | "loading" | "loaded" | "error">;
  selectedTechniqueId: Partial<Record<DatasetKey, string | null>>;
  currentDetailObjectId: Partial<Record<DatasetKey, string | null>>;
  navigationHistory: Partial<Record<DatasetKey, NavigationEntry[]>>;
  searchText: string;

  setCurrentDataset: (key: DatasetKey) => void;
  setDataset: (key: DatasetKey, data: ParsedDataset) => void;
  setDatasetLoadState: (
    key: DatasetKey,
    state: "idle" | "loading" | "loaded" | "error",
  ) => void;
  setSelectedTechniqueId: (dataset: DatasetKey, id: string | null) => void;
  setCurrentDetailObjectId: (dataset: DatasetKey, id: string | null) => void;
  openDetailObject: (
    dataset: DatasetKey,
    rootTechniqueId: string,
    currentObjectId: string,
    nextObjectId: string,
  ) => void;
  resetNavigationHistory: (dataset: DatasetKey) => void;
  setNavigationHistory: (
    dataset: DatasetKey,
    entries: NavigationEntry[],
  ) => void;
  setSearchText: (value: string) => void;

  getCurrentDataset: () => ParsedDataset | undefined;
  getSelectedTechnique: () => StixObject | undefined;
  getCurrentDetailObject: () => StixObject | undefined;
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
  currentDetailObjectId: {},
  navigationHistory: {
    enterprise: [],
    mobile: [],
    ics: [],
  },
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
        currentDetailObjectId: {
          ...state.currentDetailObjectId,
          [key]:
            state.currentDetailObjectId[key] ??
            alreadySelected ??
            firstTechniqueId,
        },
        navigationHistory: {
          ...state.navigationHistory,
          [key]: state.navigationHistory[key] ?? [],
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
      currentDetailObjectId: {
        ...state.currentDetailObjectId,
        [dataset]: id,
      },
      navigationHistory: {
        ...state.navigationHistory,
        [dataset]: [],
      },
    })),

  setCurrentDetailObjectId: (dataset, id) =>
    set((state) => ({
      currentDetailObjectId: {
        ...state.currentDetailObjectId,
        [dataset]: id,
      },
    })),

  openDetailObject: (dataset, rootTechniqueId, currentObjectId, nextObjectId) =>
    set((state) => {
      if (currentObjectId === nextObjectId) {
        return state;
      }

      const currentHistory = state.navigationHistory[dataset] ?? [];
      const scopedHistory = currentHistory.filter(
        (entry) => entry.rootTechniqueId === rootTechniqueId,
      );

      return {
        navigationHistory: {
          ...state.navigationHistory,
          [dataset]: [
            ...scopedHistory,
            {
              rootTechniqueId,
              objectId: currentObjectId,
            },
          ],
        },
        currentDetailObjectId: {
          ...state.currentDetailObjectId,
          [dataset]: nextObjectId,
        },
      };
    }),

  resetNavigationHistory: (dataset) =>
    set((state) => ({
      navigationHistory: {
        ...state.navigationHistory,
        [dataset]: [],
      },
    })),

  setNavigationHistory: (dataset, entries) =>
    set((state) => ({
      navigationHistory: {
        ...state.navigationHistory,
        [dataset]: entries,
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

  getCurrentDetailObject: () => {
    const state = get();
    const dataset = state.datasets[state.currentDataset];
    const detailId = state.currentDetailObjectId[state.currentDataset];
    if (!dataset || !detailId) return undefined;
    return dataset.objectsById[detailId];
  },
}));
