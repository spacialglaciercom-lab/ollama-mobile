/**
 * Unified Provider Factory
 * Creates and manages instances for all AI providers
 * - Ollama Cloud (Bearer token auth)
 * - Local Ollama (optional Bearer token)
 * - Google Jules (X-Goog-Api-Key header)
 */

import * as SecureStore from 'expo-secure-store';
import {
  pingServer,
  fetchModels as ollamaFetchModels,
  streamChat as ollamaStreamChat,
} from './ollamaClient';
import {
  getSources,
  createSession as julesCreateSession,
} from './julesApiService';
import {
  ProviderConfig,
  ProviderFactoryConfig,
  AnyProviderInstance,
  OllamaCloudProviderConfig,
  OllamaLocalProviderConfig,
  JulesProviderConfig,
  OllamaCloudProviderInstance,
  OllamaLocalProviderInstance,
  JulesProviderInstance,
  PROVIDER_SECURE_KEYS,
  DEFAULT_OLLAMA_CLOUD_PROVIDER,
  DEFAULT_OLLAMA_LOCAL_PROVIDER,
  DEFAULT_JULES_PROVIDER,
  isOllamaCloudProvider,
  isOllamaLocalProvider,
  isJulesProvider,
} from './providerTypes';

/**
 * ProviderFactory
 * Factory for creating provider instances of all types
 */
export class ProviderFactory {
  /**
   * Create a provider configuration based on type
   */
  static createConfig(config: ProviderFactoryConfig): ProviderConfig {
    const now = Date.now();
    const baseConfig = {
      id: `${config.type}-${now}`,
      name: config.name || this.getDefaultName(config.type),
      isConfigured: !!config.apiKey,
      isConnected: false,
      createdAt: now,
      updatedAt: now,
    };

    switch (config.type) {
      case 'ollama-cloud':
        return {
          ...baseConfig,
          type: 'ollama-cloud',
          url: config.url || DEFAULT_OLLAMA_CLOUD_PROVIDER.url,
          defaultModel: config.defaultModel,
        } as OllamaCloudProviderConfig;

      case 'ollama-local':
        return {
          ...baseConfig,
          type: 'ollama-local',
          url: config.url || DEFAULT_OLLAMA_LOCAL_PROVIDER.url,
          defaultModel: config.defaultModel,
        } as OllamaLocalProviderConfig;

      case 'jules':
        return {
          ...baseConfig,
          type: 'jules',
          defaultSourceId: config.defaultSourceId,
          defaultModel: config.defaultModel,
        } as JulesProviderConfig;

      default:
        throw new Error(`Unknown provider type: ${(config as any).type}`);
    }
  }

  /**
   * Get default provider name based on type
   */
  private static getDefaultName(type: ProviderFactoryConfig['type']): string {
    switch (type) {
      case 'ollama-cloud':
        return DEFAULT_OLLAMA_CLOUD_PROVIDER.name;
      case 'ollama-local':
        return DEFAULT_OLLAMA_LOCAL_PROVIDER.name;
      case 'jules':
        return DEFAULT_JULES_PROVIDER.name;
      default:
        return 'Unknown Provider';
    }
  }

  /**
   * Create a provider instance based on configuration
   */
  static create(config: ProviderConfig): AnyProviderInstance {
    switch (config.type) {
      case 'ollama-cloud':
        return this.createOllamaCloudProvider(config as OllamaCloudProviderConfig);
      case 'ollama-local':
        return this.createOllamaLocalProvider(config as OllamaLocalProviderConfig);
      case 'jules':
        return this.createJulesProvider(config as JulesProviderConfig);
      default:
        throw new Error(`Unknown provider type: ${(config as any).type}`);
    }
  }

  /**
   * Create an Ollama Cloud provider instance
   * Uses Bearer token authentication
   */
  private static createOllamaCloudProvider(
    config: OllamaCloudProviderConfig
  ): OllamaCloudProviderInstance {
    return {
      config,
      testConnection: async () => {
        const apiKey = await this.getApiKey(config.type, config.id);
        if (!apiKey) return false;
        
        try {
          // Test by pinging the server
          const isAlive = await pingServer(config.url, apiKey);
          return isAlive;
        } catch (error) {
          console.error('[ProviderFactory] Ollama Cloud connection test failed:', error);
          return false;
        }
      },
      getModels: async () => {
        const apiKey = await this.getApiKey(config.type, config.id);
        if (!apiKey) throw new Error('API key not found');
        
        const response = await ollamaFetchModels(config.url, apiKey);
        return response.models;
      },
      chat: async (messages: any[], model?: string) => {
        const apiKey = await this.getApiKey(config.type, config.id);
        if (!apiKey) throw new Error('API key not found');
        
        const targetModel = model || config.defaultModel || 'llama3';
        
        // Collect all messages into a single stream
        const allMessages: any[] = [];
        
        for await (const chunk of ollamaStreamChat(config.url, apiKey, {
          model: targetModel,
          messages,
          stream: true,
        })) {
          allMessages.push(chunk);
        }
        
        return allMessages;
      },
    };
  }

  /**
   * Create a Local Ollama provider instance
   * Optional Bearer token authentication
   */
  private static createOllamaLocalProvider(
    config: OllamaLocalProviderConfig
  ): OllamaLocalProviderInstance {
    return {
      config,
      testConnection: async () => {
        const apiKey = await this.getApiKey(config.type, config.id);
        
        try {
          // Test by pinging the server (local servers may not require API key)
          const isAlive = await pingServer(config.url, apiKey || undefined);
          return isAlive;
        } catch (error) {
          console.error('[ProviderFactory] Local Ollama connection test failed:', error);
          return false;
        }
      },
      getModels: async () => {
        const apiKey = await this.getApiKey(config.type, config.id);
        
        const response = await ollamaFetchModels(config.url, apiKey || undefined);
        return response.models;
      },
      chat: async (messages: any[], model?: string) => {
        const apiKey = await this.getApiKey(config.type, config.id);
        const targetModel = model || config.defaultModel || 'llama3';
        
        const allMessages: any[] = [];
        
        for await (const chunk of ollamaStreamChat(config.url, apiKey || undefined, {
          model: targetModel,
          messages,
          stream: true,
        })) {
          allMessages.push(chunk);
        }
        
        return allMessages;
      },
    };
  }

  /**
   * Create a Jules provider instance
   * Uses X-Goog-Api-Key header authentication
   */
  private static createJulesProvider(
    config: JulesProviderConfig
  ): JulesProviderInstance {
    return {
      config,
      testConnection: async () => {
        const apiKey = await this.getApiKey(config.type, config.id);
        if (!apiKey) return false;
        
        try {
          const sources = await getSources(apiKey);
          return Array.isArray(sources);
        } catch (error) {
          console.error('[ProviderFactory] Jules connection test failed:', error);
          return false;
        }
      },
      getSources: async () => {
        const apiKey = await this.getApiKey(config.type, config.id);
        if (!apiKey) throw new Error('API key not found');
        
        return getSources(apiKey);
      },
      createSession: async (
        sourceString: string,
        prompt: string,
        startingBranch?: string,
        title?: string
      ) => {
        const apiKey = await this.getApiKey(config.type, config.id);
        if (!apiKey) throw new Error('API key not found');
        
        const response = await julesCreateSession(
          apiKey,
          sourceString,
          prompt,
          startingBranch,
          title
        );
        
        return {
          session: {
            id: response.session?.id || '',
            name: response.session?.name || '',
          },
        };
      },
    };
  }

  // ============================================
  // API Key Management (Secure Storage)
  // ============================================

  /**
   * Save API key securely for a provider
   * Uses expo-secure-store (iOS Keychain / Android Keystore)
   */
  static async saveApiKey(
    type: ProviderConfig['type'],
    providerId: string,
    apiKey: string
  ): Promise<void> {
    const key = PROVIDER_SECURE_KEYS.API_KEY_PREFIX(type, providerId);
    await SecureStore.setItemAsync(key, apiKey);
  }

  /**
   * Get API key securely for a provider
   */
  static async getApiKey(
    type: ProviderConfig['type'],
    providerId: string
  ): Promise<string | null> {
    const key = PROVIDER_SECURE_KEYS.API_KEY_PREFIX(type, providerId);
    return SecureStore.getItemAsync(key);
  }

  /**
   * Remove API key for a provider
   */
  static async removeApiKey(
    type: ProviderConfig['type'],
    providerId: string
  ): Promise<void> {
    const key = PROVIDER_SECURE_KEYS.API_KEY_PREFIX(type, providerId);
    await SecureStore.deleteItemAsync(key);
  }

  // ============================================
  // Connection Testing
  // ============================================

  /**
   * Test connection for a provider using its stored API key
   */
  static async testConnection(config: ProviderConfig): Promise<boolean> {
    const instance = this.create(config);
    return instance.testConnection();
  }

  /**
   * Test connection with explicit API key (for validation before saving)
   */
  static async testConnectionWithKey(
    type: ProviderConfig['type'],
    url: string,
    apiKey: string
  ): Promise<boolean> {
    try {
      switch (type) {
        case 'ollama-cloud':
        case 'ollama-local':
          return await pingServer(url, apiKey);
        case 'jules':
          const sources = await getSources(apiKey);
          return Array.isArray(sources);
        default:
          return false;
      }
    } catch (error) {
      console.error('[ProviderFactory] Connection test failed:', error);
      return false;
    }
  }
}

// ============================================
// Helper Exports
// ============================================

export const createProvider = ProviderFactory.create;
export const createProviderConfig = ProviderFactory.createConfig;
export const saveProviderApiKey = ProviderFactory.saveApiKey;
export const getProviderApiKey = ProviderFactory.getApiKey;
export const removeProviderApiKey = ProviderFactory.removeApiKey;
export const testProviderConnection = ProviderFactory.testConnection;
export const testConnectionWithKey = ProviderFactory.testConnectionWithKey;
