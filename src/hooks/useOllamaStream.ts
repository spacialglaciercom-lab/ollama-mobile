import { useState, useCallback } from 'react';
import { streamChat } from '../api/ollamaClient';
import { useServerStore } from '../store/useServerStore';

interface UseOllamaStreamReturn {
  sendMessage: (
    model: string,
    messages: Array<{ role: string; content: string }>,
    onContent: (fullContent: string) => void,
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
      onContent: (fullContent: string) => void,
      onDone: () => void
    ) => {
      const server = useServerStore.getState().getActiveServer();
      if (!server) {
        setError('No active server configured');
        onDone();
        return;
      }

      setStreaming(true);
      setError(null);

      let fullContent = '';

      try {
        const gen = streamChat(server.url, server.apiKey, {
          model,
          messages: messages.map((m) => ({
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content,
          })),
          stream: true,
        });

        for await (const chunk of gen) {
          if (chunk.message?.content) {
            fullContent += chunk.message.content;
            onContent(fullContent);
          }
          if (chunk.done) break;
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