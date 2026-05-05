/**
 * Jules API Module Index
 * Centralized exports for Jules AI integration
 */

// ============================================
// API Service
// ============================================
export { getSources, createSession, approvePlan, sendMessage } from './julesApiService';

// ============================================
// Types
// ============================================
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

// ============================================
// Provider Types
// ============================================
export type {
  JulesProviderType,
  JulesProviderConfig,
  JulesProviderStatus,
  JulesProviderInstance,
  ProviderFactoryConfig,
} from './julesTypes';

export { DEFAULT_JULES_PROVIDER, JULES_STORAGE_KEYS, JULES_SECURE_KEYS } from './julesTypes';

// ============================================
// Provider Factory
// ============================================
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
