import { Ollama } from 'ollama/browser';
import {
  OllamaListResponse,
  ChatRequest,
  ChatResponse,
  PullRequest,
  PullResponse,
} from './types';

// Create an Ollama client instance
let clientInstance: Ollama | null = null;

export function createClient(baseUrl: string, apiKey?: string): Ollama {
  // Clean the base URL - remove trailing slashes
  const cleanUrl = baseUrl.replace(/\/+$/, '');
  
  return new Ollama({
    host: cleanUrl,
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
  });
}

export async function pingServer(baseUrl: string, apiKey?: string): Promise<boolean> {
  try {
    const cleanUrl = baseUrl.replace(/\/+$/, '');
    const url = `${cleanUrl}/api/tags`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.error('Ping failed:', error);
    return false;
  }
}

export async function fetchModels(baseUrl: string, apiKey?: string): Promise<OllamaListResponse> {
  const client = createClient(baseUrl, apiKey);
  const response = await client.list();
  return response;
}

export async function* streamChat(
  baseUrl: string,
  apiKey: string | undefined,
  request: ChatRequest
): AsyncGenerator<ChatResponse, void, unknown> {
  const client = createClient(baseUrl, apiKey);
  
  const stream = await client.chat({
    model: request.model,
    messages: request.messages,
    stream: true,
    options: request.options,
  });
  
  for await (const chunk of stream) {
    yield chunk;
  }
}

export async function* streamPull(
  baseUrl: string,
  apiKey: string | undefined,
  request: PullRequest
): AsyncGenerator<PullResponse, void, unknown> {
  const cleanUrl = baseUrl.replace(/\/+$/, '');
  const url = `${cleanUrl}/api/pull`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({ ...request, stream: true }),
  });
  
  if (!response.ok) {
    throw new Error(`Pull failed: ${response.statusText}`);
  }
  
  if (!response.body) {
    throw new Error('No response body');
  }
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    
    // Split by double newlines and parse each complete JSON object
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';
    
    for (const part of parts) {
      if (part.trim()) {
        try {
          const data = JSON.parse(part) as PullResponse;
          yield data;
        } catch (e) {
          console.error('Error parsing pull stream chunk:', e);
        }
      }
    }
  }
}

export async function deleteModel(baseUrl: string, apiKey: string | undefined, modelName: string): Promise<void> {
  const client = createClient(baseUrl, apiKey);
  await client.delete({ model: modelName });
}

export async function getModelInfo(baseUrl: string, apiKey: string | undefined, modelName: string): Promise<any> {
  const client = createClient(baseUrl, apiKey);
  const response = await client.show({ model: modelName });
  return response;
}

export async function checkServerStatus(baseUrl: string, apiKey?: string): Promise<{ status: boolean; models?: string[] }> {
  try {
    const cleanUrl = baseUrl.replace(/\/+$/, '');
    const url = `${cleanUrl}/api/tags`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
    });
    
    if (response.ok) {
      const data = await response.json();
      return { status: true, models: data.models?.map((m: any) => m.name) };
    }
    return { status: false };
  } catch (error) {
    return { status: false };
  }
}
