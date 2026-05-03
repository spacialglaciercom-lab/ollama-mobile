/**
 * Jules AI Provider Types
 * Types for Jules provider configuration and management
 */

import { JulesSource } from './types';

// ============================================
// Provider Types
// ============================================

/**
 * Provider type identifiers
 */
export type JulesProviderType = 'jules';

/**
 * Provider configuration for Jules AI
 */
export interface JulesProviderConfig {
  id: string;
  name: string;
  type: JulesProviderType;
  apiKey: string; // The JULES_API_KEY for authentication
  isConfigured: boolean;
  isConnected: boolean;
  lastConnectionTest?: number; // Timestamp of last connectivity test
  defaultSourceId?: string; // Preferred default source
  defaultModel?: string; // Preferred default model (for future use)
  createdAt: number;
  updatedAt: number;
}

/**
 * Provider readiness status
 */
export interface JulesProviderStatus {
  providerId: string;
  isReady: boolean;
  isConfigured: boolean;
  isConnected: boolean;
  lastError?: string;
  lastTestTime?: number;
}

// ============================================
// Factory Types
// ============================================

/**
 * Provider factory configuration
 */
export interface ProviderFactoryConfig {
  apiKey: string;
  name?: string;
  defaultSourceId?: string;
  defaultModel?: string;
}

/**
 * Provider instance created by factory
 */
export interface JulesProviderInstance {
  config: JulesProviderConfig;
  testConnection: () => Promise<boolean>;
  getSources: () => Promise<JulesSource[]>;
  createSession: (
    sourceString: string,
    prompt: string,
    startingBranch?: string,
    title?: string
  ) => Promise<{ session: { id: string; name: string } }>;
}

// ============================================
// Settings Types
// ============================================

/**
 * Jules Settings Store State
 */
export interface JulesSettingsState {
  // Providers
  providers: JulesProviderConfig[];
  activeProviderId: string | null;
  
  // Connection state
  connectionStatus: Record<string, JulesProviderStatus>;
  
  // Actions
  addProvider: (config: ProviderFactoryConfig) => Promise<JulesProviderConfig>;
  updateProvider: (id: string, updates: Partial<JulesProviderConfig>) => Promise<void>;
  removeProvider: (id: string) => Promise<void>;
  setActiveProvider: (id: string) => void;
  
  // Connection testing
  testProviderConnection: (id: string) => Promise<boolean>;
  testAllConnections: () => Promise<Record<string, boolean>>;
  
  // Key management
  saveApiKey: (id: string, apiKey: string) => Promise<void>;
  getApiKey: (id: string) => Promise<string | null>;
  removeApiKey: (id: string) => Promise<void>;
  
  // Defaults
  setDefaultSource: (providerId: string, sourceId: string) => Promise<void>;
  setDefaultModel: (providerId: string, model: string) => Promise<void>;
  
  // Status helpers
  getProviderStatus: (id: string) => JulesProviderStatus;
  getReadyProviders: () => JulesProviderConfig[];
  getConfiguredProviders: () => JulesProviderConfig[];
  
  // Provider factory
  createProvider: (config: ProviderFactoryConfig) => JulesProviderInstance;
}

// ============================================
// Constants
// ============================================

/**
 * Default Jules provider configuration
 */
export const DEFAULT_JULES_PROVIDER: Omit<JulesProviderConfig, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'Google Jules',
  type: 'jules',
  apiKey: '',
  isConfigured: false,
  isConnected: false,
  defaultSourceId: undefined,
  defaultModel: undefined,
};

/**
 * Storage keys for MMKV
 */
export const JULES_STORAGE_KEYS = {
  PROVIDERS: 'jules-providers',
  ACTIVE_PROVIDER: 'jules-active-provider',
  CONNECTION_STATUS: 'jules-connection-status',
};

/**
 * Secure storage keys for expo-secure-store
 */
export const JULES_SECURE_KEYS = {
  API_KEY_PREFIX: 'jules-api-key-',
};
