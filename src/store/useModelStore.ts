import { create } from 'zustand';

import { useServerStore } from './useServerStore';
import { fetchModels as apiFetchModels } from '../api/ollamaClient';

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

    if (server.type === 'zeroclaw') {
      set({
        models: [
          {
            name: 'ZeroClaw Agent',
            size: 0,
            digest: 'zeroclaw',
            modified_at: new Date().toISOString(),
            model: 'zeroclaw',
            format: 'acp',
            family: 'zeroclaw',
            families: ['zeroclaw'],
            parameter_size: 'unknown',
            quantization_level: 'none',
          },
        ] as any,
        selectedModel: 'ZeroClaw Agent',
        loading: false,
        error: null,
      });
      return;
    }

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
