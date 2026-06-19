import { create } from 'zustand';

import { buildServerUrl } from './useServerStore';
import { useProviderStore } from './useProviderStore';
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
    const activeProvider = useProviderStore.getState().getActiveProvider();
    if (!activeProvider || activeProvider.type === 'jules') {
      set({ error: 'No active Ollama server', loading: false });
      return;
    }

    // Convert provider to legacy server format for compatibility
    const server = {
      ...activeProvider,
      apiKey: await useProviderStore.getState().getApiKey(activeProvider.id),
    } as any;

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
      const response = await apiFetchModels(buildServerUrl(server), server.apiKey);
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
