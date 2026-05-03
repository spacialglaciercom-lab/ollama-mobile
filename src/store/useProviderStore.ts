/**
 * Unified Provider Store
 * Manages all AI provider configurations (Ollama Cloud, Local Ollama, Jules)
 * with secure API key storage and connection testing
 */

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
  DEFAULT_JULES_PROVIDER,
  isOllamaCloudProvider,
  isOllamaLocalProvider,
  isJulesProvider,
} from '../api/providerTypes';

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
  setActiveProvider: (id: string) => void;

  // ============================================
  // Connection Testing
  // ============================================

  /**
   * Test connection for a specific provider
   */
  testProviderConnection: (id: string) => Promise<boolean>;

  /**
   * Test connections for all providers
   */
  testAllConnections: () => Promise<Record<string, boolean>>;

  // ============================================
  // API Key Management (Secure)
  // ============================================

  /**
   * Save API key for a provider
   */
  saveApiKey: (id: string, apiKey: string) => Promise<void>;

  /**
   * Get API key for a provider
   */
  getApiKey: (id: string) => Promise<string | null>;

  /**
   * Remove API key for a provider
   */
  removeApiKey: (id: string) => Promise<void>;

  // ============================================
  // Status Helpers
  // ============================================

  /**
   * Get readiness status for a provider
   */
  getProviderStatus: (id: string) => ProviderStatus;

  /**
   * Check if a provider is fully ready
   */
  isProviderReady: (id: string) => boolean;

  /**
   * Get all ready providers
   */
  getReadyProviders: () => ProviderConfig[];

  /**
   * Get providers by type
   */
  getProvidersByType: (type: ProviderConfig['type']) => ProviderConfig[];

  // ============================================
  // Factory Access
  // ============================================

  /**
   * Create a provider instance for API usage
   */
  getProviderInstance: (id: string) => Promise<AnyProviderInstance>;
}

export const useProviderStore = create<ProviderStore>()(
  persist(
    (set, get) => ({
      // State
      providers: [],
      activeProviderId: null,
      connectionStatus: {},

      // ============================================
      // CRUD Implementation
      // ============================================

      addProvider: async (factoryConfig) => {
        const newConfig = ProviderFactory.createConfig(factoryConfig);

        // If API key is provided, save it securely
        if (factoryConfig.apiKey) {
          await saveProviderApiKey(newConfig.type, newConfig.id, factoryConfig.apiKey);
          newConfig.isConfigured = true;

          // Test connection immediately
          const url = (newConfig as any).url || '';
          const isConnected = await testConnectionWithKey(
            newConfig.type,
            url,
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

      updateProvider: async (id, updates) => {
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

      removeProvider: async (id) => {
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
        const newActiveId =
          activeProviderId === id ? (newProviders[0]?.id ?? null) : activeProviderId;

        set({
          providers: newProviders,
          activeProviderId: newActiveId,
          connectionStatus: newConnectionStatus,
        });
      },

      setActiveProvider: (id) => {
        const { providers } = get();
        if (!providers.some((p) => p.id === id)) {
          throw new Error(`Provider with id ${id} not found`);
        }
        set({ activeProviderId: id });
      },

      // ============================================
      // Connection Testing Implementation
      // ============================================

      testProviderConnection: async (id) => {
        const { providers } = get();
        const provider = providers.find((p) => p.id === id);

        if (!provider) {
          throw new Error(`Provider with id ${id} not found`);
        }

        const apiKey = await getProviderApiKey(provider.type, id);

        try {
          const isConnected = await testProviderConn(provider);

          set((state) => ({
            providers: state.providers.map((p) =>
              p.id === id
                ? ({
                    ...p,
                    isConnected,
                    isConfigured: !!apiKey,
                    lastConnectionTest: Date.now(),
                  } as ProviderConfig)
                : p
            ),
            connectionStatus: {
              ...state.connectionStatus,
              [id]: {
                providerId: id,
                isReady: isConnected && !!apiKey,
                isConfigured: !!apiKey,
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
              p.id === id ? ({ ...p, isConnected: false } as ProviderConfig) : p
            ),
            connectionStatus: {
              ...state.connectionStatus,
              [id]: {
                providerId: id,
                isReady: false,
                isConfigured: !!apiKey,
                isConnected: false,
                lastError: errorMessage,
                lastTestTime: Date.now(),
              },
            },
          }));

          return false;
        }
      },

      testAllConnections: async () => {
        const { providers } = get();
        const results: Record<string, boolean> = {};

        for (const provider of providers) {
          results[provider.id] = await get().testProviderConnection(provider.id);
        }

        return results;
      },

      // ============================================
      // API Key Management Implementation
      // ============================================

      saveApiKey: async (id, apiKey) => {
        const { providers } = get();
        const provider = providers.find((p) => p.id === id);
        if (!provider) throw new Error(`Provider ${id} not found`);

        await saveProviderApiKey(provider.type, id, apiKey);

        // Update provider state
        set((state) => ({
          providers: state.providers.map((p) =>
            p.id === id ? ({ ...p, isConfigured: true } as ProviderConfig) : p
          ),
        }));
      },

      getApiKey: async (id) => {
        const { providers } = get();
        const provider = providers.find((p) => p.id === id);
        if (!provider) return null;
        return getProviderApiKey(provider.type, id);
      },

      removeApiKey: async (id) => {
        const { providers } = get();
        const provider = providers.find((p) => p.id === id);
        if (!provider) return;

        await removeProviderApiKey(provider.type, id);

        // Update provider state
        set((state) => ({
          providers: state.providers.map((p) =>
            p.id === id ? ({ ...p, isConfigured: false, isConnected: false } as ProviderConfig) : p
          ),
        }));
      },

      // ============================================
      // Status Helpers Implementation
      // ============================================

      getProviderStatus: (id) => {
        const { providers, connectionStatus } = get();
        const provider = providers.find((p) => p.id === id);

        if (!provider) {
          throw new Error(`Provider with id ${id} not found`);
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

      isProviderReady: (id) => {
        const status = get().getProviderStatus(id);
        return status.isReady;
      },

      getReadyProviders: () => {
        const { providers } = get();
        return providers.filter((p) => p.isConfigured && p.isConnected);
      },

      getProvidersByType: (type) => {
        const { providers } = get();
        return providers.filter((p) => p.type === type);
      },

      // ============================================
      // Factory Access Implementation
      // ============================================

      getProviderInstance: async (id) => {
        const { providers } = get();
        const config = providers.find((p) => p.id === id);
        if (!config) throw new Error(`Provider ${id} not found`);

        const apiKey = await getProviderApiKey(config.type, id);
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
      partialize: (state) =>
        ({
          // Only persist non-sensitive data
          providers: state.providers.map((p) => ({
            ...p,
            apiKey: undefined, // Never persist API keys
          })),
          activeProviderId: state.activeProviderId,
          connectionStatus: state.connectionStatus,
        }) as any,
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
  const { providers, activeProviderId } = useProviderStore();
  return providers.find((p) => p.id === activeProviderId) || null;
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
