import { useState, useCallback } from 'react';

import { streamChat } from '../api/ollamaClient';
import { streamZeroClawChat } from '../api/zeroclawClient';
import { useServerStore, buildServerUrl } from '../store/useServerStore';

interface UseOllamaStreamReturn {
  sendMessage: (
    model: string,
    messages: { role: string; content: string }[],
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
      messages: { role: string; content: string }[],
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
        let gen;
        const serverUrl = buildServerUrl(server);
        if (server.type === 'zeroclaw') {
          gen = streamZeroClawChat(
            serverUrl,
            server.apiKey,
            messages.map((m) => ({
              role: m.role as 'user' | 'assistant' | 'system',
              content: m.content,
            }))
          );
        } else {
          gen = streamChat(serverUrl, server.apiKey, {
            model,
            messages: messages.map((m) => ({
              role: m.role as 'user' | 'assistant' | 'system',
              content: m.content,
            })),
            stream: true,
          });
        }

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
        console.error('Chat stream error:', err);
        setError(err?.message ?? 'Stream failed');
        setStreaming(false);
        onDone();
      }
    },
    []
  );

  return { sendMessage, streaming, error };
}
