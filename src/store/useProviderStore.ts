import { MMKV } from 'react-native-mmkv';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import {
  ProviderFactory,
  saveProviderApiKey,
  getProviderApiKey,
  removeProviderApiKey,
  testProviderConnection as testProviderConn,
  testConnectionWithKey,
} from '../api/providerFactory';
import {
  ProviderConfig,
  ProviderFactoryConfig,
  ProviderStatus,
  AnyProviderInstance,
  PROVIDER_STORAGE_KEYS,
  DEFAULT_OLLAMA_CLOUD_PROVIDER,
  DEFAULT_OLLAMA_LOCAL_PROVIDER,
  isJulesProvider,
} from '../api/providerTypes';

const storage = new MMKV();

interface ProviderStore {
  providers: ProviderConfig[];
  activeProviderId: string | null;
  connectionStatus: Record<string, ProviderStatus>;

  addProvider: (config: ProviderFactoryConfig) => Promise<ProviderConfig>;
  updateProvider: (id: string, updates: Partial<ProviderConfig>) => Promise<void>;
  removeProvider: (id: string) => Promise<void>;
  setActiveProvider: (id: string) => void;
  testProviderConnection: (id: string) => Promise<boolean>;
  testAllConnections: () => Promise<Record<string, boolean>>;
  validateConnection: (type: ProviderConfig['type'], url: string, apiKey: string) => Promise<boolean>;
  saveApiKey: (id: string, apiKey: string) => Promise<void>;
  getApiKey: (id: string) => Promise<string | null>;
  removeApiKey: (id: string) => Promise<void>;
  setDefaultModel: (providerId: string, model: string) => Promise<void>;
  setDefaultSource: (providerId: string, sourceId: string) => Promise<void>;
  getProviderStatus: (id: string) => ProviderStatus | undefined;
  getReadyProviders: () => ProviderConfig[];
  getConfiguredProviders: () => ProviderConfig[];
  getProvidersByType: (type: ProviderConfig['type']) => ProviderConfig[];
  getActiveProvider: () => ProviderConfig | null;
  isProviderReady: (id: string) => boolean;
  createProviderInstance: (id: string) => AnyProviderInstance | null;
  createProviderFromConfig: (config: ProviderConfig) => AnyProviderInstance;
}

export const useProviderStore = create<ProviderStore>()(
  persist(
    (set, get) => ({
      providers: [],
      activeProviderId: null,
      connectionStatus: {},

      addProvider: async (config: ProviderFactoryConfig): Promise<ProviderConfig> => {
        const newConfig = ProviderFactory.createConfig(config);

        if (config.apiKey) {
          await saveProviderApiKey(newConfig.type, newConfig.id, config.apiKey);
          const isConnected = await testConnectionWithKey(
            newConfig.type,
            factoryConfig.url ||
              (newConfig.type === 'ollama-cloud'
                ? DEFAULT_OLLAMA_CLOUD_PROVIDER.url
                : newConfig.type === 'ollama-local'
                  ? DEFAULT_OLLAMA_LOCAL_PROVIDER.url
                  : ''),
            factoryConfig.apiKey
          );
          newConfig.isConnected = isConnected;
          if (isConnected) {
            newConfig.lastConnectionTest = Date.now();
          }
        }

        set((state) => ({
          providers: [...state.providers, newConfig],
          activeProviderId: state.activeProviderId || newConfig.id,
        }));

        return newConfig;
      },

      updateProvider: async (id: string, updates: Partial<ProviderConfig>): Promise<void> => {
        const { providers } = get();
        const existingIndex = providers.findIndex((p) => p.id === id);

        if (existingIndex === -1) {
          throw new Error(`Provider with id ${id} not found`);
        }

        const updatedProvider = {
          ...providers[existingIndex],
          ...updates,
          updatedAt: Date.now(),
        };

        set((state) => {
          const newProviders = [...state.providers];
          newProviders[existingIndex] = updatedProvider as ProviderConfig;
          return { providers: newProviders };
        });
      },

      removeProvider: async (id: string): Promise<void> => {
        const { providers, activeProviderId, connectionStatus } = get();
        const provider = providers.find((p) => p.id === id);
        if (provider) {
          await removeProviderApiKey(provider.type, id);
        }

        const newConnectionStatus = { ...connectionStatus };
        delete newConnectionStatus[id];

        // Find new active provider if current is being removed
        const newProviders = providers.filter((p) => p.id !== id);
        const newActiveId =
          activeProviderId === id ? (newProviders[0]?.id ?? null) : activeProviderId;

        set({
          providers: newProviders,
          activeProviderId: newActiveId,
          connectionStatus: newConnectionStatus,
        }));
      },

      setActiveProvider: (id: string) => {
        set({ activeProviderId: id });
      },

      testProviderConnection: async (id: string): Promise<boolean> => {
        const { providers } = get();
        const provider = providers.find((p) => p.id === id);
        if (!provider) throw new Error(`Provider with id ${id} not found`);

        try {
          const isConnected = await testProviderConn(provider);
          set((state) => ({
            providers: state.providers.map((p) =>
              p.id === id
                ? {
                    ...p,
                    isConnected,
                    isConfigured: true,
                    lastConnectionTest: isConnected ? Date.now() : p.lastConnectionTest,
                  } as ProviderConfig
                : p
            ),
            connectionStatus: {
              ...state.connectionStatus,
              [id]: {
                providerId: id,
                isReady: isConnected && provider.isConfigured,
                isConfigured: true,
                isConnected,
                lastError: undefined,
                lastTestTime: Date.now(),
              },
            },
          }));
          return isConnected;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          set((state) => ({
            providers: state.providers.map((p) => (p.id === id ? { ...p, isConnected: false } : p)),
            connectionStatus: {
              ...state.connectionStatus,
              [id]: {
                providerId: id,
                isReady: false,
                isConfigured: provider.isConfigured,
                isConnected: false,
                lastError: errorMessage,
                lastTestTime: Date.now(),
              },
            },
          }));
          return false;
        }
      },

      testAllConnections: async (): Promise<Record<string, boolean>> => {
        const { providers } = get();
        const testPromises = providers.map(async (provider) => {
          const isConnected = await get().testProviderConnection(provider.id);
          return [provider.id, isConnected] as [string, boolean];
        });
        const resultsArray = await Promise.all(testPromises);
        return Object.fromEntries(resultsArray);
      },

      validateConnection: async (type, url, apiKey) => testConnectionWithKey(type, url, apiKey),

      saveApiKey: async (id, apiKey) => {
        const provider = get().providers.find((p) => p.id === id);
        if (!provider) throw new Error(`Provider with id ${id} not found`);
        await saveProviderApiKey(provider.type, id, apiKey);
        set((state) => ({
          providers: state.providers.map((p) => (p.id === id ? { ...p, isConfigured: true } : p)),
          connectionStatus: {
            ...state.connectionStatus,
            [id]: {
              ...state.connectionStatus[id],
              isConfigured: true,
            },
          },
        }));
      },

      getApiKey: async (id) => {
        const provider = get().providers.find((p) => p.id === id);
        if (!provider) throw new Error(`Provider with id ${id} not found`);
        return getProviderApiKey(provider.type, id);
      },

      removeApiKey: async (id) => {
        const provider = get().providers.find((p) => p.id === id);
        if (!provider) throw new Error(`Provider with id ${id} not found`);
        await removeProviderApiKey(provider.type, id);
        set((state) => ({
          providers: state.providers.map((p) =>
            p.id === id ? { ...p, isConfigured: false, isConnected: false } as ProviderConfig : p
          ),
        }));
      },

      setDefaultModel: async (providerId, model) => {
        await get().updateProvider(providerId, { defaultModel: model });
      },

      setDefaultSource: async (providerId, sourceId) => {
        const provider = get().providers.find((p) => p.id === providerId);
        if (provider && !isJulesProvider(provider)) return;
        await get().updateProvider(providerId, { defaultSourceId: sourceId } as any);
      },

      getProviderStatus: (id) => {
        const provider = get().providers.find((p) => p.id === id);
        if (!provider) return undefined;
        const storedStatus = get().connectionStatus[id];
        return {
          providerId: id,
          isReady: provider.isConnected && provider.isConfigured,
          isConfigured: provider.isConfigured,
          isConnected: provider.isConnected,
          lastError: storedStatus?.lastError,
          lastTestTime: provider.lastConnectionTest || storedStatus?.lastTestTime,
        };
      },

      getReadyProviders: () => get().providers.filter((p) => p.isConfigured && p.isConnected),
      getConfiguredProviders: () => get().providers.filter((p) => p.isConfigured),
      getProvidersByType: (type) => get().providers.filter((p) => p.type === type),
      getActiveProvider: () => {
        const { providers, activeProviderId } = get();
        return providers.find((p) => p.id === activeProviderId) || null;
      },
      isProviderReady: (id) => get().getProviderStatus(id)?.isReady ?? false,

      createProviderInstance: (id) => {
        const provider = get().providers.find((p) => p.id === id);
        return provider ? ProviderFactory.create(provider) : null;
      },
      createProviderFromConfig: (config) => ProviderFactory.create(config),
    }),
    {
      name: PROVIDER_STORAGE_KEYS.PROVIDERS,
      storage: createJSONStorage(() => ({
        getItem: (key) => storage.getString(key) ?? null,
        setItem: (key, val) => storage.set(key, val),
        removeItem: (key) => storage.delete(key),
      })),
      partialize: (state) => ({
        providers: state.providers.map((p) => ({ ...p, apiKey: undefined })),
        activeProviderId: state.activeProviderId,
        connectionStatus: state.connectionStatus,
      }),
    }
  )
);

export const useActiveProvider = () => {
  const { getActiveProvider } = useProviderStore();
  return useProviderStore(() => getActiveProvider());
};
