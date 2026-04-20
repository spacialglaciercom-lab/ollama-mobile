import { ChatResponse } from './types';

/**
 * Parses newline-delimited JSON stream from Ollama
 * Ollama returns JSON objects separated by double newlines
 */
export function parseSSEStream(stream: ReadableStream<Uint8Array>): AsyncGenerator<ChatResponse, void, unknown> {
  return new AsyncGenerator<ChatResponse, void, unknown>(async (controller) => {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Split by double newlines
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          if (part.trim()) {
            try {
              const data = JSON.parse(part) as ChatResponse;
              controller.yield(data);
            } catch (e) {
              console.error('Error parsing stream chunk:', e, part);
            }
          }
        }
      }

      // Process any remaining data in buffer
      if (buffer.trim()) {
        try {
          const data = JSON.parse(buffer) as ChatResponse;
          controller.yield(data);
        } catch (e) {
          console.error('Error parsing final buffer:', e);
        }
      }
    } catch (error) {
      controller.throw(error);
    } finally {
      reader.releaseLock();
    }

    controller.return();
  });
}

/**
 * Creates a fetch request with streaming support for chat
 */
export async function createChatStreamRequest(
  baseUrl: string,
  apiKey: string | undefined,
  model: string,
  messages: Array<{ role: string; content: string }>,
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
  }
): Promise<ReadableStream<Uint8Array>> {
  const cleanUrl = baseUrl.replace(/\/+$/, '');
  const url = `${cleanUrl}/api/chat`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
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
 * Helper to accumulate streaming response content
 */
export function accumulateStreamContent(
  stream: AsyncGenerator<ChatResponse, void, unknown>
): AsyncGenerator<string, void, unknown> {
  return new AsyncGenerator<string, void, unknown>(async (controller) => {
    let fullContent = '';

    try {
      for await (const chunk of stream) {
        if (chunk.message.content) {
          fullContent += chunk.message.content;
          controller.yield(chunk.message.content);
        }

        if (chunk.done) {
          controller.yield('[DONE]');
        }
      }
    } catch (error) {
      controller.throw(error);
    }

    controller.return();
  });
}
