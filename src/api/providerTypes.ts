/**
 * Unified Provider Types
 * Type definitions for all AI providers (Jules, Ollama Cloud, Local Ollama, ZeroClaw)
 */

import { JulesSource } from './types';

// ============================================
// Provider Type Identifiers
// ============================================

export type ProviderType = 'jules' | 'ollama-cloud' | 'ollama-local' | 'zeroclaw';

// ============================================
// Base Provider Configuration
// ============================================

/**
 * Base configuration for any AI provider
 */
export interface BaseProviderConfig {
  id: string;
  name: string;
  type: ProviderType;
  isConfigured: boolean;
  isConnected: boolean;
  lastConnectionTest?: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Ollama Cloud provider configuration
 */
export interface OllamaCloudProviderConfig extends BaseProviderConfig {
  type: 'ollama-cloud';
  url: string; // e.g., 'https://ollama.com' or 'https://api.ollama.com'
  apiKey?: string; // Stored securely in SecureStore, not in config
  defaultModel?: string; // Preferred model for this provider
}

/**
 * Local Ollama provider configuration
 */
export interface OllamaLocalProviderConfig extends BaseProviderConfig {
  type: 'ollama-local';
  url: string; // e.g., 'http://192.168.1.100:11434'
  apiKey?: string; // Optional for local servers
  defaultModel?: string;
}

/**
 * ZeroClaw provider configuration
 */
export interface ZeroClawProviderConfig extends BaseProviderConfig {
  type: 'zeroclaw';
  url: string; // e.g., 'http://localhost:8080'
  apiKey?: string;
  defaultModel?: string;
}

/**
 * Jules provider configuration (imported from julesTypes)
 * Kept separate for Jules-specific fields
 */
export interface JulesProviderConfig extends BaseProviderConfig {
  type: 'jules';
  apiKey?: string; // Stored securely in SecureStore
  defaultSourceId?: string;
  defaultModel?: string;
}

/**
 * Union type for all provider configurations
 */
export type ProviderConfig = 
  | OllamaCloudProviderConfig 
  | OllamaLocalProviderConfig 
  | ZeroClawProviderConfig
  | JulesProviderConfig;

// ============================================
// Provider Status
// ============================================

/**
 * Provider readiness status
 */
export interface ProviderStatus {
  providerId: string;
  isReady: boolean;
  isConfigured: boolean;
  isConnected: boolean;
  lastError?: string;
  lastTestTime?: number;
}

// ============================================
// Factory Configuration
// ============================================

/**
 * Configuration for creating a new provider
 */
export interface ProviderFactoryConfig {
  type: ProviderType;
  name?: string;
  url?: string; // For Ollama/ZeroClaw providers
  apiKey?: string;
  defaultModel?: string;
  defaultSourceId?: string; // For Jules
}

// ============================================
// Provider Instance
// ============================================

/**
 * Common API methods for all providers
 */
export interface BaseProviderInstance<T extends BaseProviderConfig = BaseProviderConfig> {
  config: T;
  testConnection: () => Promise<boolean>;
}

/**
 * Ollama Cloud provider instance
 */
export interface OllamaCloudProviderInstance extends BaseProviderInstance<OllamaCloudProviderConfig> {
  getModels: () => Promise<any[]>;
  chat: (messages: any[], model?: string) => Promise<any>;
}

/**
 * Local Ollama provider instance
 */
export interface OllamaLocalProviderInstance extends BaseProviderInstance<OllamaLocalProviderConfig> {
  getModels: () => Promise<any[]>;
  chat: (messages: any[], model?: string) => Promise<any>;
}

/**
 * ZeroClaw provider instance
 */
export interface ZeroClawProviderInstance extends BaseProviderInstance<ZeroClawProviderConfig> {
  chat: (messages: any[]) => Promise<any>;
}

/**
 * Jules provider instance
 */
export interface JulesProviderInstance extends BaseProviderInstance<JulesProviderConfig> {
  getSources: () => Promise<JulesSource[]>;
  createSession: (
    sourceString: string,
    prompt: string,
    startingBranch?: string,
    title?: string
  ) => Promise<{ session: { id: string; name: string } }>;
}

/**
 * Union type for all provider instances
 */
export type AnyProviderInstance = 
  | OllamaCloudProviderInstance 
  | OllamaLocalProviderInstance 
  | ZeroClawProviderInstance
  | JulesProviderInstance;

// ============================================
// Storage Keys
// ============================================

/**
 * Storage keys for MMKV persistence
 */
export const PROVIDER_STORAGE_KEYS = {
  PROVIDERS: 'ai-providers',
  ACTIVE_PROVIDER: 'ai-active-provider',
  CONNECTION_STATUS: 'ai-connection-status',
};

/**
 * Secure storage keys for expo-secure-store
 * Format: {type}-api-key-{id}
 */
export const PROVIDER_SECURE_KEYS = {
  API_KEY_PREFIX: (type: ProviderType, id: string) => `${type}-api-key-${id}`,
};

// ============================================
// Default Configurations
// ============================================

/**
 * Default Ollama Cloud configuration
 */
export const DEFAULT_OLLAMA_CLOUD_PROVIDER: Omit<OllamaCloudProviderConfig, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'Ollama Cloud',
  type: 'ollama-cloud',
  url: 'https://ollama.com',
  isConfigured: false,
  isConnected: false,
};

/**
 * Default Local Ollama configuration
 */
export const DEFAULT_OLLAMA_LOCAL_PROVIDER: Omit<OllamaLocalProviderConfig, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'Local Ollama',
  type: 'ollama-local',
  url: 'http://localhost:11434',
  isConfigured: false,
  isConnected: false,
};

/**
 * Default ZeroClaw configuration
 */
export const DEFAULT_ZEROCLAW_PROVIDER: Omit<ZeroClawProviderConfig, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'ZeroClaw',
  type: 'zeroclaw',
  url: 'http://localhost:8080',
  isConfigured: false,
  isConnected: false,
};

/**
 * Default Jules configuration
 */
export const DEFAULT_JULES_PROVIDER: Omit<JulesProviderConfig, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'Google Jules',
  type: 'jules',
  isConfigured: false,
  isConnected: false,
};

// ============================================
// Type Guards
// ============================================

/**
 * Check if a provider config is Ollama Cloud
 */
export function isOllamaCloudProvider(config: ProviderConfig): config is OllamaCloudProviderConfig {
  return config.type === 'ollama-cloud';
}

/**
 * Check if a provider config is Local Ollama
 */
export function isOllamaLocalProvider(config: ProviderConfig): config is OllamaLocalProviderConfig {
  return config.type === 'ollama-local';
}

/**
 * Check if a provider config is ZeroClaw
 */
export function isZeroClawProvider(config: ProviderConfig): config is ZeroClawProviderConfig {
  return config.type === 'zeroclaw';
}

/**
 * Check if a provider config is Jules
 */
export function isJulesProvider(config: ProviderConfig): config is JulesProviderConfig {
  return config.type === 'jules';
}

/**
 * Check if a provider instance is Ollama Cloud
 */
export function isOllamaCloudInstance(instance: AnyProviderInstance): instance is OllamaCloudProviderInstance {
  return instance.config.type === 'ollama-cloud';
}

/**
 * Check if a provider instance is Local Ollama
 */
export function isOllamaLocalInstance(instance: AnyProviderInstance): instance is OllamaLocalProviderInstance {
  return instance.config.type === 'ollama-local';
}

/**
 * Check if a provider instance is ZeroClaw
 */
export function isZeroClawInstance(instance: AnyProviderInstance): instance is ZeroClawProviderInstance {
  return instance.config.type === 'zeroclaw';
}

/**
 * Check if a provider instance is Jules
 */
export function isJulesInstance(instance: AnyProviderInstance): instance is JulesProviderInstance {
  return instance.config.type === 'jules';
}
