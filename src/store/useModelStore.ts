import { create } from 'zustand';
import { fetchModels as apiFetchModels } from '../api/ollamaClient';
import { useServerStore } from './useServerStore';

interface ModelInfo {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
  model: string;
  format: string;
  family: string;
  families: string[];
  parameter_size: string;
  quantization_level: string;
}

interface ModelStore {
  models: ModelInfo[];
  selectedModel: string | null;
  loading: boolean;
  error: string | null;
  fetchModels: () => Promise<void>;
  selectModel: (name: string) => void;
}

export const useModelStore = create<ModelStore>((set) => ({
  models: [],
  selectedModel: null,
  loading: false,
  error: null,

  fetchModels: async () => {
    const server = useServerStore.getState().getActiveServer();
    if (!server) {
      set({ error: 'No active server', loading: false });
      return;
    }

    set({ loading: true, error: null });

    try {
      const response = await apiFetchModels(server.url, server.apiKey);
      set({
        models: response.models as ModelInfo[],
        loading: false,
        error: null,
      });
    } catch (err: any) {
      set({
        error: err?.message ?? 'Failed to fetch models',
        loading: false,
      });
    }
  },

  selectModel: (name) => set({ selectedModel: name }),
}));