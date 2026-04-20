import { useState, useCallback } from 'react';
import { createClient } from '../api/ollamaClient';
import { useServerStore } from '../store/useServerStore';

interface UseOllamaStreamReturn {
  sendMessage: (
    model: string,
    messages: Array<{ role: string; content: string }>,
    onToken: (token: string) => void,
    onDone: () => void
  ) => Promise<void>;
  streaming: boolean;
  error: string | null;
}

export function useOllamaStream(): UseOllamaStreamReturn {
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (
      model: string,
      messages: Array<{ role: string; content: string }>,
      onToken: (token: string) => void,
      onDone: () => void
    ) => {
      const server = useServerStore.getState().getActiveServer();
      if (!server) {
        setError('No active server configured');
        return;
      }

      setStreaming(true);
      setError(null);

      try {
        const client = createClient(server.url, server.apiKey);
        const stream = await client.chat({
          model,
          messages: messages.map((m) => ({
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content,
          })),
          stream: true,
        });

        let fullContent = '';

        for await (const chunk of stream) {
          if (chunk.message?.content) {
            fullContent += chunk.message.content;
            onToken(fullContent);
          }

          if (chunk.done) {
            break;
          }
        }

        setStreaming(false);
        onDone();
      } catch (err: any) {
        console.error('Ollama stream error:', err);
        setError(err?.message ?? 'Stream failed');
        setStreaming(false);
        onDone();
      }
    },
    []
  );

  return { sendMessage, streaming, error };
}