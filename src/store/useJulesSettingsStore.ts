/**
 * Jules Settings Store
 * Manages Jules provider configurations with persistence and secure key storage
 *
 * NOTE: This file is kept for backward compatibility.
 * New code should use the unified useProviderStore from useProviderStore.ts
 */

import * as SecureStore from 'expo-secure-store';
import { MMKV } from 'react-native-mmkv';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { getSources } from '../api/julesApiService';
import { JulesProviderFactory } from '../api/julesProviderFactory';
import {
  JulesProviderConfig,
  JulesProviderInstance,
  JulesProviderStatus,
  JulesSettingsState,
  ProviderFactoryConfig,
  JULES_STORAGE_KEYS,
  JULES_SECURE_KEYS,
  DEFAULT_JULES_PROVIDER,
} from '../api/julesTypes';

const storage = new MMKV();

/**
 * Create the Jules Settings Store
 */
export const useJulesSettingsStore = create<JulesSettingsState>()(
  persist(
    (set, get) => ({
      // Initial state
      providers: [],
      activeProviderId: null,
      connectionStatus: {},

      // ============================================
      // Provider CRUD Operations
      // ============================================

      addProvider: async (factoryConfig: ProviderFactoryConfig): Promise<JulesProviderConfig> => {
        const newConfig = JulesProviderFactory.createConfig(factoryConfig);

        // Save API key securely if provided
        if (factoryConfig.apiKey) {
          await SecureStore.setItemAsync(
            `${JULES_SECURE_KEYS.API_KEY_PREFIX}${newConfig.id}`,
            factoryConfig.apiKey
          );
          newConfig.isConfigured = true;
        }

        set((state) => ({
          providers: [...state.providers, newConfig],
          activeProviderId: state.activeProviderId || newConfig.id,
        }));

        return newConfig;
      },

      updateProvider: async (id: string, updates: Partial<JulesProviderConfig>): Promise<void> => {
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

        set((state) => ({
          providers: [
            ...state.providers.slice(0, existingIndex),
            updatedProvider,
            ...state.providers.slice(existingIndex + 1),
          ],
        }));
      },

      removeProvider: async (id: string): Promise<void> => {
        const { providers, activeProviderId } = get();

        // Remove API key from secure storage
        await SecureStore.deleteItemAsync(`${JULES_SECURE_KEYS.API_KEY_PREFIX}${id}`);

        // Remove connection status
        const newConnectionStatus = { ...get().connectionStatus };
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

      setActiveProvider: (id: string): void => {
        const { providers } = get();
        if (!providers.some((p) => p.id === id)) {
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

        const apiKey = await SecureStore.getItemAsync(`${JULES_SECURE_KEYS.API_KEY_PREFIX}${id}`);

        if (!apiKey) {
          // Update status
          set((state) => ({
            providers: state.providers.map((p) =>
              p.id === id ? { ...p, isConnected: false, isConfigured: false } : p
            ),
            connectionStatus: {
              ...state.connectionStatus,
              [id]: {
                providerId: id,
                isReady: false,
                isConfigured: false,
                isConnected: false,
                lastError: 'API key not found',
                lastTestTime: Date.now(),
              },
            },
          }));
          return false;
        }

        try {
          const isConnected = await JulesProviderFactory.testConnection(apiKey);

          set((state) => ({
            providers: state.providers.map((p) =>
              p.id === id
                ? {
                    ...p,
                    isConnected,
                    isConfigured: true,
                    lastConnectionTest: Date.now(),
                  }
                : p
            ),
            connectionStatus: {
              ...state.connectionStatus,
              [id]: {
                providerId: id,
                isReady: isConnected,
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
                isConfigured: true,
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

      // ============================================
      // API Key Management (Secure Storage)
      // ============================================

      saveApiKey: async (id: string, apiKey: string): Promise<void> => {
        await SecureStore.setItemAsync(`${JULES_SECURE_KEYS.API_KEY_PREFIX}${id}`, apiKey);

        // Update provider state
        set((state) => ({
          providers: state.providers.map((p) =>
            p.id === id ? { ...p, isConfigured: true, apiKey: '***' } : p
          ),
        }));
      },

      getApiKey: async (id: string): Promise<string | null> => {
        return SecureStore.getItemAsync(`${JULES_SECURE_KEYS.API_KEY_PREFIX}${id}`);
      },

      removeApiKey: async (id: string): Promise<void> => {
        await SecureStore.deleteItemAsync(`${JULES_SECURE_KEYS.API_KEY_PREFIX}${id}`);

        // Update provider state
        set((state) => ({
          providers: state.providers.map((p) =>
            p.id === id ? { ...p, isConfigured: false, isConnected: false, apiKey: '' } : p
          ),
        }));
      },

      // ============================================
      // Defaults Management
      // ============================================

      setDefaultSource: async (providerId: string, sourceId: string): Promise<void> => {
        await get().updateProvider(providerId, { defaultSourceId: sourceId });
      },

      setDefaultModel: async (providerId: string, model: string): Promise<void> => {
        await get().updateProvider(providerId, { defaultModel: model });
      },

      // ============================================
      // Status Helpers
      // ============================================

      getProviderStatus: (id: string): JulesProviderStatus => {
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

      getReadyProviders: (): JulesProviderConfig[] => {
        const { providers } = get();
        return providers.filter((p) => p.isConfigured && p.isConnected);
      },

      getConfiguredProviders: (): JulesProviderConfig[] => {
        const { providers } = get();
        return providers.filter((p) => p.isConfigured);
      },

      // ============================================
      // Provider Factory
      // ============================================

      createProvider: (config: ProviderFactoryConfig): JulesProviderInstance => {
        const providerConfig = JulesProviderFactory.createConfig(config);
        return JulesProviderFactory.create(providerConfig);
      },
    }),
    {
      name: 'jules-settings',
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
          apiKey: p.apiKey ? '***' : '', // Don't persist actual API key
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
 * Get the active Jules provider
 */
export const useActiveJulesProvider = () => {
  const { providers, activeProviderId } = useJulesSettingsStore();
  return providers.find((p) => p.id === activeProviderId) || null;
};

/**
 * Check if any Jules provider is ready
 */
export const useHasReadyJulesProvider = () => {
  const { getReadyProviders } = useJulesSettingsStore();
  return getReadyProviders().length > 0;
};

/**
 * Get all ready Jules providers
 */
export const useReadyJulesProviders = () => {
  const { getReadyProviders } = useJulesSettingsStore();
  return getReadyProviders();
};

/**
 * Get connection status for a specific provider
 */
export const useJulesProviderStatus = (providerId: string) => {
  const { getProviderStatus } = useJulesSettingsStore();
  return getProviderStatus(providerId);
};
