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

export interface ServerInfo {
  id: string;
  name: string;
  url: string;
  apiKey?: string;
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