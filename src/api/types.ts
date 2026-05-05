// Ollama API Response Types

export interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
  model: string;
  format: string;
  family: string;
  families: string[];
  parameter_size: string;
  quantization_level: string;
}

export interface OllamaListResponse {
  models: OllamaModel[];
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: string[];
}

export interface ChatRequest {
  model: string;
  messages: Message[];
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
    repeat_penalty?: number;
  };
}

export interface ChatResponse {
  model: string;
  message: Message;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export interface StreamChatResponse {
  model: string;
  message: Message;
  done: boolean;
}

export interface PullRequest {
  name: string;
  stream?: boolean;
}

export interface PullResponse {
  status: string;
  name?: string;
  digest?: string;
  total?: number;
  completed?: number;
}

export type ServerType = 'ollama' | 'zeroclaw' | 'jules';

export interface ServerInfo {
  id: string;
  name: string;
  url: string;
  apiKey?: string;
  type: ServerType;
  isConnected: boolean;
  lastPing?: number;
}

export interface Conversation {
  id: string;
  title: string;
  model: string;
  systemPrompt?: string;
  createdAt: number;
  updatedAt: number;
}

export interface StoredMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
}

export interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: StoredMessage[];
}

// ZeroClaw ACP Types
export interface ACPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

export interface ACPResponse {
  jsonrpc: '2.0';
  id?: string | number;
  result?: any;
  error?: any;
  method?: string;
  params?: any;
}

export interface ACPSessionUpdate {
  sessionId: string;
  update: {
    sessionUpdate: 'agent_message_chunk' | 'agent_thought_chunk' | 'tool_call' | 'tool_call_update';
    content?: {
      type: 'text';
      text: string;
    };
    toolCallId?: string;
    title?: string;
    kind?: string;
    status?: 'pending' | 'finished';
    rawInput?: any;
    rawOutput?: any;
  };
}

// ============================================
// Google Jules AI API Types (v1alpha)
// ============================================

/**
 * A connected GitHub repository source in Jules
 */
export interface JulesSource {
  name: string;
  id: string;
  repositoryUri: string;
  branch?: string;
  state?: string;
  lastSyncTime?: string;
  createTime?: string;
  updateTime?: string;
}

/**
 * Response for listing Jules sources
 */
export interface JulesSourcesResponse {
  sources: JulesSource[];
}

/**
 * GitHub repository context for a Jules session
 */
export interface JulesGitHubRepoContext {
  startingBranch?: string;
}

/**
 * Source context for a Jules session
 */
export interface JulesSourceContext {
  source: string;
  githubRepoContext?: JulesGitHubRepoContext;
}

/**
 * Request payload for creating a Jules session
 */
export interface JulesSessionCreateRequest {
  prompt: string;
  sourceContext: JulesSourceContext;
  title?: string;
}

/**
 * A Jules session
 */
export interface JulesSession {
  name: string;
  id: string;
  title?: string;
  sourceContext?: JulesSourceContext;
  state?: string;
  createTime?: string;
  updateTime?: string;
  agent?: string;
}

/**
 * Response for creating a Jules session
 */
export interface JulesSessionCreateResponse {
  session: JulesSession;
}

/**
 * Response for approving a Jules session plan
 */
export interface JulesApprovePlanResponse {
  session: JulesSession;
  approved: boolean;
}

/**
 * Request payload for sending a message to a Jules session
 */
export interface JulesSendMessageRequest {
  prompt: string;
}

/**
 * Response for sending a message to a Jules session
 */
export interface JulesSendMessageResponse {
  session: JulesSession;
  message?: {
    id: string;
    content: string;
    role?: string;
    createTime?: string;
  };
}
