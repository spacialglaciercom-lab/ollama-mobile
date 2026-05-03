import { ChatResponse } from './types';

/**
 * Creates a fetch request with streaming support for chat
 */
export async function createChatStreamRequest(
  baseUrl: string,
  apiKey: string | undefined,
  model: string,
  messages: { role: string; content: string }[],
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
  }
): Promise<ReadableStream<Uint8Array>> {
  const cleanUrl = baseUrl.replace(/\/+$/, '');
  const url = `${cleanUrl}/api/chat`;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      options,
    }),
  });

  if (!response.ok) {
    throw new Error(`Chat request failed: ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error('No response body');
  }

  return response.body;
}

/**
 * Parse a ReadableStream into an async generator of ChatResponse objects
 */
export async function* parseChatStream(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<ChatResponse, void, unknown> {
  const reader = stream.getReader();
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
          const data = JSON.parse(line) as ChatResponse;
          yield data;
        } catch (e) {
          console.error('Error parsing stream chunk:', e, line);
        }
      }
    }

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

/**
 * Accumulates streaming content into full text, yielding the accumulated string each token
 */
export async function* accumulateStreamContent(
  stream: AsyncGenerator<ChatResponse, void, unknown>
): AsyncGenerator<string, void, unknown> {
  let fullContent = '';

  for await (const chunk of stream) {
    if (chunk.message?.content) {
      fullContent += chunk.message.content;
      yield fullContent;
    }
  }
}
