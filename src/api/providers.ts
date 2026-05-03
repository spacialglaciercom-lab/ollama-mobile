/**
 * AI Providers Module
 * Unified provider system for all AI services
 * 
 * Supported Providers:
 * - Ollama Cloud: Bearer token authentication
 * - Local Ollama: Optional Bearer token authentication
 * - ZeroClaw: Agent Client Protocol (ACP) over WebSockets
 * - Google Jules: X-Goog-Api-Key header authentication
 */

// ============================================
// Main Exports
// ============================================

// Provider types
export type {
  ProviderType,
  BaseProviderConfig,
  OllamaCloudProviderConfig,
  OllamaLocalProviderConfig,
  ZeroClawProviderConfig,
  JulesProviderConfig,
  ProviderConfig,
  ProviderStatus,
  ProviderFactoryConfig,
  BaseProviderInstance,
  OllamaCloudProviderInstance,
  OllamaLocalProviderInstance,
  ZeroClawProviderInstance,
  JulesProviderInstance,
  AnyProviderInstance,
} from './providerTypes';

export {
  PROVIDER_STORAGE_KEYS,
  PROVIDER_SECURE_KEYS,
  DEFAULT_OLLAMA_CLOUD_PROVIDER,
  DEFAULT_OLLAMA_LOCAL_PROVIDER,
  DEFAULT_ZEROCLAW_PROVIDER,
  DEFAULT_JULES_PROVIDER,
  isOllamaCloudProvider,
  isOllamaLocalProvider,
  isZeroClawProvider,
  isJulesProvider,
  isOllamaCloudInstance,
  isOllamaLocalInstance,
  isZeroClawInstance,
  isJulesInstance,
} from './providerTypes';

// Provider factory
export {
  ProviderFactory,
  createProvider,
  createProviderConfig,
  saveProviderApiKey,
  getProviderApiKey,
  removeProviderApiKey,
  testProviderConnection,
  testConnectionWithKey,
} from './providerFactory';

// ============================================
// Re-exports for backward compatibility
// ============================================

// Jules-specific exports (backward compatible)
export type {
  JulesSource,
  JulesSession,
  JulesSessionCreateRequest,
  JulesSessionCreateResponse,
  JulesSourcesResponse,
  JulesApprovePlanResponse,
  JulesSendMessageRequest,
  JulesSendMessageResponse,
  JulesGitHubRepoContext,
  JulesSourceContext,
} from './types';

export {
  getSources,
  createSession,
  approvePlan,
  sendMessage,
} from './julesApiService';

// Legacy Jules types
export type {
  JulesProviderType,
  JulesProviderStatus as LegacyJulesProviderStatus,
  JulesProviderInstance as LegacyJulesProviderInstance,
  ProviderFactoryConfig as LegacyProviderFactoryConfig,
} from './julesTypes';

export {
  DEFAULT_JULES_PROVIDER as LEGACY_DEFAULT_JULES_PROVIDER,
  JULES_STORAGE_KEYS,
  JULES_SECURE_KEYS,
} from './julesTypes';

export {
  JulesProviderFactory,
  createJulesProvider,
  createJulesConfig,
  saveJulesApiKey,
  getJulesApiKey,
  removeJulesApiKey,
  testJulesConnection,
  getJulesApiFunctions,
} from './julesProviderFactory';
