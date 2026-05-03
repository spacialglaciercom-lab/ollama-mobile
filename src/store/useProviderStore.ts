/**
 * Unified Provider Store
 * Manages all AI provider configurations (Ollama Cloud, Local Ollama, Jules)
 * with secure API key storage and connection testing
 */

import { MMKV } from 'react-native-mmkv';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import {
  ProviderConfig,
  ProviderFactoryConfig,
  ProviderStatus,
  AnyProviderInstance,
  PROVIDER_STORAGE_KEYS,
  DEFAULT_OLLAMA_CLOUD_PROVIDER,
  DEFAULT_OLLAMA_LOCAL_PROVIDER,
  DEFAULT_JULES_PROVIDER,
  isOllamaCloudProvider,
  isOllamaLocalProvider,
  isJulesProvider,
} from '../api/providerTypes';
import {
  ProviderFactory,
  saveProviderApiKey,
  getProviderApiKey,
  removeProviderApiKey,
  testProviderConnection as testProviderConn,
  testConnectionWithKey,
} from '../api/providerFactory';

const storage = new MMKV();

interface ProviderStore {
  // State
  providers: ProviderConfig[];
  activeProviderId: string | null;
  connectionStatus: Record<string, ProviderStatus>;

  // ============================================
  // Provider CRUD Operations
  // ============================================

  /**
   * Add a new provider
   */
  addProvider: (factoryConfig: ProviderFactoryConfig) => Promise<ProviderConfig>;

  /**
   * Update an existing provider
   */
  updateProvider: (id: string, updates: Partial<ProviderConfig>) => Promise<void>;

  /**
   * Remove a provider
   */
  removeProvider: (id: string) => Promise<void>;

  /**
   * Set the active provider
   */
  setActiveProvider: (id: string | null) => void;

  // ============================================
  // Connection Testing
  // ============================================

  /**
   * Test connection for a specific provider
   */
  testProviderConnection: (id: string) => Promise<boolean>;

  /**
   * Test all provider connections
   */
  testAllConnections: () => Promise<Record<string, boolean>>;

  /**
   * Test connection with explicit API key before saving
   */
  validateConnection: (
    type: ProviderConfig['type'],
    url: string,
    apiKey: string
  ) => Promise<boolean>;

  // ============================================
  // API Key Management (Secure Storage)
  // ============================================

  /**
   * Save API key securely for a provider
   */
  saveApiKey: (id: string, apiKey: string) => Promise<void>;

  /**
   * Get API key securely for a provider
   */
  getApiKey: (id: string) => Promise<string | null>;

  /**
   * Remove API key for a provider
   */
  removeApiKey: (id: string) => Promise<void>;

  // ============================================
  // Defaults Management
  // ============================================

  /**
   * Set default model for a provider
   */
  setDefaultModel: (providerId: string, model: string) => Promise<void>;

  /**
   * Set default source for Jules provider
   */
  setDefaultSource: (providerId: string, sourceId: string) => Promise<void>;

  // ============================================
  // Status Helpers
  // ============================================

  /**
   * Get provider status
   */
  getProviderStatus: (id: string) => ProviderStatus | undefined;

  /**
   * Get all ready providers (configured + connected)
   */
  getReadyProviders: () => ProviderConfig[];

  /**
   * Get all configured providers
   */
  getConfiguredProviders: () => ProviderConfig[];

  /**
   * Get providers by type
   */
  getProvidersByType: (type: ProviderConfig['type']) => ProviderConfig[];

  /**
   * Get active provider
   */
  getActiveProvider: () => ProviderConfig | null;

  /**
   * Check if a provider is ready
   */
  isProviderReady: (id: string) => boolean;

  // ============================================
  // Provider Factory
  // ============================================

  /**
   * Create a provider instance
   */
  createProviderInstance: (id: string) => AnyProviderInstance | null;

  /**
   * Create a provider instance from config
   */
  createProviderFromConfig: (config: ProviderConfig) => AnyProviderInstance;
}

export const useProviderStore = create<ProviderStore>()(
  persist(
    (set, get) => ({
      // Initial state
      providers: [],
      activeProviderId: null,
      connectionStatus: {},

      // ============================================
      // Provider CRUD Operations
      // ============================================

      addProvider: async (factoryConfig: ProviderFactoryConfig): Promise<ProviderConfig> => {
        const newConfig = ProviderFactory.createConfig(factoryConfig);

        // Save API key securely if provided
        if (factoryConfig.apiKey) {
          await saveProviderApiKey(newConfig.type, newConfig.id, factoryConfig.apiKey);
          newConfig.isConfigured = true;
        }

        // If API key was provided, test the connection
        if (factoryConfig.apiKey) {
          const isConnected = await testConnectionWithKey(
            newConfig.type,
            factoryConfig.url || (
              newConfig.type === 'ollama-cloud' ? DEFAULT_OLLAMA_CLOUD_PROVIDER.url :
              newConfig.type === 'ollama-local' ? DEFAULT_OLLAMA_LOCAL_PROVIDER.url :
              ''
            ),
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
        } as ProviderConfig;

        set((state) => ({
          providers: [
            ...state.providers.slice(0, existingIndex),
            updatedProvider,
            ...state.providers.slice(existingIndex + 1),
          ],
        }));
      },

      removeProvider: async (id: string): Promise<void> => {
        const { providers, activeProviderId, connectionStatus } = get();

        // Remove API key from secure storage
        const provider = providers.find((p) => p.id === id);
        if (provider) {
          await removeProviderApiKey(provider.type, id);
        }

        // Remove connection status
        const newConnectionStatus = { ...connectionStatus };
        delete newConnectionStatus[id];

        // Find new active provider if current is being removed
        const newProviders = providers.filter((p) => p.id !== id);
        const newActiveId = activeProviderId === id ? (newProviders[0]?.id ?? null) : activeProviderId;

        set({
          providers: newProviders,
          activeProviderId: newActiveId,
          connectionStatus: newConnectionStatus,
        });
      },

      setActiveProvider: (id: string | null): void => {
        const { providers } = get();
        if (id && !providers.some((p) => p.id === id)) {
          throw new Error(`Provider with id ${id} not found`);
        }
        set({ activeProviderId: id });
      },

      // ============================================
      // Connection Testing
      // ============================================

      testProviderConnection: async (id: string): Promise<boolean> => {
        const { providers } = get();
        const provider = providers.find((p) => p.id === id);

        if (!provider) {
          throw new Error(`Provider with id ${id} not found`);
        }

        try {
          const isConnected = await testProviderConn(provider);

          // Update provider state
          set((state) => ({
            providers: state.providers.map((p) =>
              p.id === id
                ? {
                    ...p,
                    isConnected,
                    isConfigured: true,
                    lastConnectionTest: isConnected ? Date.now() : p.lastConnectionTest,
                  }
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
            providers: state.providers.map((p) =>
              p.id === id ? { ...p, isConnected: false } : p
            ),
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
        const results: Record<string, boolean> = {};

        for (const provider of providers) {
          results[provider.id] = await get().testProviderConnection(provider.id);
        }

        return results;
      },

      validateConnection: async (
        type: ProviderConfig['type'],
        url: string,
        apiKey: string
      ): Promise<boolean> => {
        return testConnectionWithKey(type, url, apiKey);
      },

      // ============================================
      // API Key Management (Secure Storage)
      // ============================================

      saveApiKey: async (id: string, apiKey: string): Promise<void> => {
        const { providers } = get();
        const provider = providers.find((p) => p.id === id);

        if (!provider) {
          throw new Error(`Provider with id ${id} not found`);
        }

        await saveProviderApiKey(provider.type, id, apiKey);

        // Update provider state
        set((state) => ({
          providers: state.providers.map((p) =>
            p.id === id ? { ...p, isConfigured: true } : p
          ),
          connectionStatus: {
            ...state.connectionStatus,
            [id]: {
              ...state.connectionStatus[id],
              isConfigured: true,
            },
          },
        }));
      },

      getApiKey: async (id: string): Promise<string | null> => {
        const { providers } = get();
        const provider = providers.find((p) => p.id === id);

        if (!provider) {
          throw new Error(`Provider with id ${id} not found`);
        }

        return getProviderApiKey(provider.type, id);
      },

      removeApiKey: async (id: string): Promise<void> => {
        const { providers } = get();
        const provider = providers.find((p) => p.id === id);

        if (!provider) {
          throw new Error(`Provider with id ${id} not found`);
        }

        await removeProviderApiKey(provider.type, id);

        // Update provider state
        set((state) => ({
          providers: state.providers.map((p) =>
            p.id === id ? { ...p, isConfigured: false, isConnected: false } : p
          ),
          connectionStatus: {
            ...state.connectionStatus,
            [id]: {
              ...state.connectionStatus[id],
              isConfigured: false,
              isConnected: false,
            },
          },
        }));
      },

      // ============================================
      // Defaults Management
      // ============================================

      setDefaultModel: async (providerId: string, model: string): Promise<void> => {
        await get().updateProvider(providerId, { defaultModel: model });
      },

      setDefaultSource: async (providerId: string, sourceId: string): Promise<void> => {
        // Only Jules providers support defaultSourceId
        const { providers } = get();
        const provider = providers.find((p) => p.id === providerId);

        if (provider && !isJulesProvider(provider)) {
          console.warn(`Provider ${providerId} does not support defaultSourceId`);
          return;
        }

        await get().updateProvider(providerId, { defaultSourceId: sourceId });
      },

      // ============================================
      // Status Helpers
      // ============================================

      getProviderStatus: (id: string): ProviderStatus | undefined => {
        const { providers, connectionStatus } = get();
        const provider = providers.find((p) => p.id === id);

        if (!provider) {
          return undefined;
        }

        const storedStatus = connectionStatus[id];

        return {
          providerId: id,
          isReady: provider.isConnected && provider.isConfigured,
          isConfigured: provider.isConfigured,
          isConnected: provider.isConnected,
          lastError: storedStatus?.lastError,
          lastTestTime: provider.lastConnectionTest || storedStatus?.lastTestTime,
        };
      },

      getReadyProviders: (): ProviderConfig[] => {
        const { providers } = get();
        return providers.filter((p) => p.isConfigured && p.isConnected);
      },

      getConfiguredProviders: (): ProviderConfig[] => {
        const { providers } = get();
        return providers.filter((p) => p.isConfigured);
      },

      getProvidersByType: (type: ProviderConfig['type']): ProviderConfig[] => {
        const { providers } = get();
        return providers.filter((p) => p.type === type);
      },

      getActiveProvider: (): ProviderConfig | null => {
        const { providers, activeProviderId } = get();
        if (!activeProviderId) return null;
        return providers.find((p) => p.id === activeProviderId) || null;
      },

      isProviderReady: (id: string): boolean => {
        const status = get().getProviderStatus(id);
        return status?.isReady ?? false;
      },

      // ============================================
      // Provider Factory
      // ============================================

      createProviderInstance: (id: string): AnyProviderInstance | null => {
        const { providers } = get();
        const provider = providers.find((p) => p.id === id);

        if (!provider) {
          return null;
        }

        return ProviderFactory.create(provider);
      },

      createProviderFromConfig: (config: ProviderConfig): AnyProviderInstance => {
        return ProviderFactory.create(config);
      },
    }),
    {
      name: PROVIDER_STORAGE_KEYS.PROVIDERS,
      storage: createJSONStorage(() => ({
        getItem: (key) => {
          const val = storage.getString(key);
          return val ?? null;
        },
        setItem: (key, val) => storage.set(key, JSON.stringify(val)),
        removeItem: (key) => storage.delete(key),
      })),
      partialize: (state) => ({
        // Only persist non-sensitive data
        providers: state.providers.map((p) => ({
          ...p,
          apiKey: undefined, // Never persist API keys
        })),
        activeProviderId: state.activeProviderId,
        connectionStatus: state.connectionStatus,
      }),
    }
  )
);

// ============================================
// Helper Hooks
// ============================================

/**
 * Get the active provider
 */
export const useActiveProvider = () => {
  const { getActiveProvider } = useProviderStore();
  return useProviderStore((state) => getActiveProvider());
};

/**
 * Check if any provider is ready
 */
export const useHasReadyProvider = () => {
  const { getReadyProviders } = useProviderStore();
  return useProviderStore((state) => getReadyProviders().length > 0);
};

/**
 * Get all ready providers
 */
export const useReadyProviders = () => {
  const { getReadyProviders } = useProviderStore();
  return useProviderStore((state) => getReadyProviders());
};

/**
 * Get providers by type (e.g., 'ollama-cloud', 'jules')
 */
export const useProvidersByType = (type: ProviderConfig['type']) => {
  const { getProvidersByType } = useProviderStore();
  return useProviderStore((state) => getProvidersByType(type));
};

/**
 * Check if a specific provider is ready
 */
export const useProviderReady = (providerId: string) => {
  const { isProviderReady } = useProviderStore();
  return useProviderStore((state) => isProviderReady(providerId));
};

/**
 * Get connection status for a specific provider
 */
export const useProviderStatus = (providerId: string) => {
  const { getProviderStatus } = useProviderStore();
  return useProviderStore((state) => getProviderStatus(providerId));
};

/**
 * Get all providers
 */
export const useAllProviders = () => {
  return useProviderStore((state) => state.providers);
};

/**
 * Get active provider ID
 */
export const useActiveProviderId = () => {
  return useProviderStore((state) => state.activeProviderId);
};
