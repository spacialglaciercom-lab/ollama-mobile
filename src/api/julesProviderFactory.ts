/**
 * Jules Provider Factory
 * Centralized provider instantiation for Jules AI
 * 
 * NOTE: This file is kept for backward compatibility.
 * New code should use the unified ProviderFactory from providerFactory.ts
 */

import * as SecureStore from 'expo-secure-store';
import {
  getSources,
  createSession as apiCreateSession,
  approvePlan as apiApprovePlan,
  sendMessage as apiSendMessage,
} from './julesApiService';
import {
  JulesProviderConfig,
  JulesProviderInstance,
  ProviderFactoryConfig,
  JULES_SECURE_KEYS,
} from './julesTypes';
import { JulesSource } from './types';

/**
 * JulesProviderFactory
 * Factory for creating and managing Jules provider instances
 */
export class JulesProviderFactory {
  /**
   * Create a new Jules provider instance
   */
  static create(config: JulesProviderConfig): JulesProviderInstance {
    return {
      config,
      testConnection: async () => {
        try {
          // Test connection by fetching sources
          // We need to get the API key from secure storage
          const apiKey = await SecureStore.getItemAsync(
            `${JULES_SECURE_KEYS.API_KEY_PREFIX}${config.id}`
          );
          
          if (!apiKey) {
            return false;
          }
          
          // Make a lightweight request to test connectivity
          const sources = await getSources(apiKey);
          return Array.isArray(sources);
        } catch (error) {
          console.error('[JulesProviderFactory] Connection test failed:', error);
          return false;
        }
      },
      
      getSources: async () => {
        const apiKey = await SecureStore.getItemAsync(
          `${JULES_SECURE_KEYS.API_KEY_PREFIX}${config.id}`
        );
        
        if (!apiKey) {
          throw new Error('API key not found for provider');
        }
        
        return getSources(apiKey);
      },
      
      createSession: async (
        sourceString: string,
        prompt: string,
        startingBranch?: string,
        title?: string
      ) => {
        const apiKey = await SecureStore.getItemAsync(
          `${JULES_SECURE_KEYS.API_KEY_PREFIX}${config.id}`
        );
        
        if (!apiKey) {
          throw new Error('API key not found for provider');
        }
        
        const response = await apiCreateSession(
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

  /**
   * Create a provider configuration from factory config
   */
  static createConfig(factoryConfig: ProviderFactoryConfig): JulesProviderConfig {
    const now = Date.now();
    return {
      ...DEFAULT_JULES_PROVIDER,
      ...factoryConfig,
      id: `jules-${now}`,
      apiKey: '', // Don't store API key in config, use secure storage
      isConfigured: !!factoryConfig.apiKey,
      isConnected: false,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Save API key securely for a provider
   */
  static async saveApiKey(providerId: string, apiKey: string): Promise<void> {
    await SecureStore.setItemAsync(
      `${JULES_SECURE_KEYS.API_KEY_PREFIX}${providerId}`,
      apiKey
    );
  }

  /**
   * Get API key securely for a provider
   */
  static async getApiKey(providerId: string): Promise<string | null> {
    return SecureStore.getItemAsync(
      `${JULES_SECURE_KEYS.API_KEY_PREFIX}${providerId}`
    );
  }

  /**
   * Remove API key for a provider
   */
  static async removeApiKey(providerId: string): Promise<void> {
    await SecureStore.deleteItemAsync(
      `${JULES_SECURE_KEYS.API_KEY_PREFIX}${providerId}`
    );
  }

  /**
   * Test connection for a provider with given API key
   */
  static async testConnection(apiKey: string): Promise<boolean> {
    try {
      const sources = await getSources(apiKey);
      return Array.isArray(sources);
    } catch (error) {
      console.error('[JulesProviderFactory] Connection test failed:', error);
      return false;
    }
  }

  /**
   * Get all available API functions for a provider
   */
  static getApiFunctions(apiKey: string) {
    return {
      getSources: () => getSources(apiKey),
      createSession: (
        sourceString: string,
        prompt: string,
        startingBranch?: string,
        title?: string
      ) => apiCreateSession(apiKey, sourceString, prompt, startingBranch, title),
      approvePlan: (sessionId: string) => apiApprovePlan(apiKey, sessionId),
      sendMessage: (sessionId: string, message: string) => apiSendMessage(apiKey, sessionId, message),
    };
  }
}

// Export helper functions for direct use
export const createJulesProvider = JulesProviderFactory.create;
export const createJulesConfig = JulesProviderFactory.createConfig;
export const saveJulesApiKey = JulesProviderFactory.saveApiKey;
export const getJulesApiKey = JulesProviderFactory.getApiKey;
export const removeJulesApiKey = JulesProviderFactory.removeApiKey;
export const testJulesConnection = JulesProviderFactory.testConnection;
export const getJulesApiFunctions = JulesProviderFactory.getApiFunctions;
