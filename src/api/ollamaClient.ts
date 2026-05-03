import { OllamaListResponse, ChatRequest, ChatResponse, PullRequest, PullResponse } from './types';

// Create headers for Ollama API requests
function makeHeaders(apiKey?: string): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  return headers;
}

// Clean URL helper
function cleanUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

export async function pingServer(baseUrl: string, apiKey?: string): Promise<boolean> {
  try {
    const url = `${cleanUrl(baseUrl)}/api/tags`;
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
  const url = `${cleanUrl(baseUrl)}/api/tags`;

  const response = await fetch(url, {
    method: 'GET',
    headers: makeHeaders(apiKey),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.statusText}`);
  }

  return response.json();
}

export async function* streamChat(
  baseUrl: string,
  apiKey: string | undefined,
  request: ChatRequest
): AsyncGenerator<ChatResponse, void, unknown> {
  const url = `${cleanUrl(baseUrl)}/api/chat`;

  const response = await fetch(url, {
    method: 'POST',
    headers: makeHeaders(apiKey),
    body: JSON.stringify({
      model: request.model,
      messages: request.messages,
      stream: true,
      options: request.options,
    }),
  });

  if (!response.ok) {
    throw new Error(`Chat request failed: ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error('No response body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Ollama sends newline-delimited JSON
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line) as ChatResponse;
          yield data;
        } catch (e) {
          console.error('Error parsing chat stream chunk:', e);
        }
      }
    }

    // Process remaining buffer
    if (buffer.trim()) {
      try {
        const data = JSON.parse(buffer) as ChatResponse;
        yield data;
      } catch (e) {
        console.error('Error parsing final buffer:', e);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function* streamPull(
  baseUrl: string,
  apiKey: string | undefined,
  request: PullRequest
): AsyncGenerator<PullResponse, void, unknown> {
  const url = `${cleanUrl(baseUrl)}/api/pull`;

  const response = await fetch(url, {
    method: 'POST',
    headers: makeHeaders(apiKey),
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

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line) as PullResponse;
          yield data;
        } catch (e) {
          console.error('Error parsing pull stream chunk:', e);
        }
      }
    }

    if (buffer.trim()) {
      try {
        const data = JSON.parse(buffer) as PullResponse;
        yield data;
      } catch (e) {
        console.error('Error parsing final pull buffer:', e);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function deleteModel(
  baseUrl: string,
  apiKey: string | undefined,
  modelName: string
): Promise<void> {
  const url = `${cleanUrl(baseUrl)}/api/delete`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: makeHeaders(apiKey),
    body: JSON.stringify({ model: modelName }),
  });

  if (!response.ok) {
    throw new Error(`Delete failed: ${response.statusText}`);
  }
}

export async function getModelInfo(
  baseUrl: string,
  apiKey: string | undefined,
  modelName: string
): Promise<any> {
  const url = `${cleanUrl(baseUrl)}/api/show`;

  const response = await fetch(url, {
    method: 'POST',
    headers: makeHeaders(apiKey),
    body: JSON.stringify({ model: modelName }),
  });

  if (!response.ok) {
    throw new Error(`Show failed: ${response.statusText}`);
  }

  return response.json();
}

export async function checkServerStatus(
  baseUrl: string,
  apiKey?: string
): Promise<{ status: boolean; models?: string[] }> {
  try {
    const url = `${cleanUrl(baseUrl)}/api/tags`;

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
