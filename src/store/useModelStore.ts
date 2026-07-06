import { create } from 'zustand';

import { useProviderStore } from './useProviderStore';
import { fetchModels as apiFetchModels } from '../api/ollamaClient';
import { isJulesProvider, isZeroClawProvider } from '../api/providerTypes';

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
    const provider = useProviderStore.getState().getActiveProvider();
    if (!provider) {
      set({ error: 'No active provider', loading: false });
      return;
    }

    set({ loading: true, error: null });

    if (isZeroClawProvider(provider)) {
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

    if (isJulesProvider(provider)) {
      set({
        models: [
          {
            name: 'Jules Agent',
            size: 0,
            digest: 'jules',
            modified_at: new Date().toISOString(),
            model: 'jules',
            format: 'jules',
            family: 'jules',
            families: ['jules'],
            parameter_size: 'unknown',
            quantization_level: 'none',
          },
        ] as any,
        selectedModel: 'Jules Agent',
        loading: false,
        error: null,
      });
      return;
    }

    try {
      const apiKey = await useProviderStore.getState().getApiKey(provider.id);
      const response = await apiFetchModels((provider as any).url, apiKey ?? undefined);
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
