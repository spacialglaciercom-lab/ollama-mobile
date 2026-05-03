import * as SecureStore from 'expo-secure-store';

import {
  fetchModels as ollamaFetchModels,
  pingServer,
  streamChat as ollamaStreamChat
} from './ollamaClient';
import { getSources, createSession as julesCreateSession } from './julesApiService';
import { streamZeroClawChat, pingZeroClaw } from './zeroclawClient';
import {
  AnyProviderInstance,
  ProviderConfig,
  ProviderFactoryConfig,
  OllamaCloudProviderConfig,
  OllamaLocalProviderConfig,
  ZeroClawProviderConfig,
  JulesProviderConfig,
  OllamaCloudProviderInstance,
  OllamaLocalProviderInstance,
  ZeroClawProviderInstance,
  JulesProviderInstance,
  PROVIDER_SECURE_KEYS,
  DEFAULT_OLLAMA_CLOUD_PROVIDER,
  DEFAULT_OLLAMA_LOCAL_PROVIDER,
  DEFAULT_ZEROCLAW_PROVIDER,
  DEFAULT_JULES_PROVIDER,
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

      case 'zeroclaw':
        return {
          ...baseConfig,
          type: 'zeroclaw',
          url: config.url || DEFAULT_ZEROCLAW_PROVIDER.url,
          defaultModel: config.defaultModel,
        } as ZeroClawProviderConfig;

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
      case 'zeroclaw':
        return DEFAULT_ZEROCLAW_PROVIDER.name;
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
      case 'zeroclaw':
        return this.createZeroClawProvider(config as ZeroClawProviderConfig);
      case 'jules':
        return this.createJulesProvider(config as JulesProviderConfig);
      default:
        throw new Error(`Unknown provider type: ${(config as any).type}`);
    }
  }

  private static createOllamaCloudProvider(
    config: OllamaCloudProviderConfig
  ): OllamaCloudProviderInstance {
    return {
      config,
      testConnection: async () => {
        const apiKey = await this.getApiKey(config.type, config.id);
        if (!apiKey) return false;
        try {
          return await pingServer(config.url, apiKey);
        } catch {
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

  private static createOllamaLocalProvider(
    config: OllamaLocalProviderConfig
  ): OllamaLocalProviderInstance {
    return {
      config,
      testConnection: async () => {
        const apiKey = await this.getApiKey(config.type, config.id);
        try {
          return await pingServer(config.url, apiKey || undefined);
        } catch {
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

  private static createZeroClawProvider(
    config: ZeroClawProviderConfig
  ): ZeroClawProviderInstance {
    return {
      config,
      testConnection: async () => {
        const apiKey = await this.getApiKey(config.type, config.id);
        try {
          return await pingZeroClaw(config.url, apiKey || undefined);
        } catch {
          return false;
        }
      },
      chat: async (messages: any[]) => {
        const apiKey = await this.getApiKey(config.type, config.id);
        const allMessages: any[] = [];
        for await (const chunk of streamZeroClawChat(config.url, apiKey || undefined, messages)) {
          allMessages.push(chunk);
        }
        return allMessages;
      },
    };
  }

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
        } catch {
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

  static async saveApiKey(
    type: ProviderConfig['type'],
    providerId: string,
    apiKey: string
  ): Promise<void> {
    const key = PROVIDER_SECURE_KEYS.API_KEY_PREFIX(type, providerId);
    await SecureStore.setItemAsync(key, apiKey);
  }

  static async getApiKey(
    type: ProviderConfig['type'],
    providerId: string
  ): Promise<string | null> {
    const key = PROVIDER_SECURE_KEYS.API_KEY_PREFIX(type, providerId);
    return SecureStore.getItemAsync(key);
  }

  static async removeApiKey(
    type: ProviderConfig['type'],
    providerId: string
  ): Promise<void> {
    const key = PROVIDER_SECURE_KEYS.API_KEY_PREFIX(type, providerId);
    await SecureStore.deleteItemAsync(key);
  }

  static async testConnection(config: ProviderConfig): Promise<boolean> {
    const instance = this.create(config);
    return instance.testConnection();
  }

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
        case 'zeroclaw':
          return await pingZeroClaw(url, apiKey);
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

export const createProvider = ProviderFactory.create;
export const createProviderConfig = ProviderFactory.createConfig;
export const saveProviderApiKey = ProviderFactory.saveApiKey;
export const getProviderApiKey = ProviderFactory.getApiKey;
export const removeProviderApiKey = ProviderFactory.removeApiKey;
export const testProviderConnection = ProviderFactory.testConnection;
export const testConnectionWithKey = ProviderFactory.testConnectionWithKey;
