import { useState, useCallback } from 'react';

import { streamChat } from '../api/ollamaClient';
import { streamZeroClawChat } from '../api/zeroclawClient';
import { useProviderStore } from '../store/useProviderStore';

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
      const provider = useProviderStore.getState().getActiveProvider();
      if (!provider) {
        setError('No active provider configured');
        onDone();
        return;
      }

      setStreaming(true);
      setError(null);

      let fullContent = '';

      try {
        let gen;
        const apiKey = await useProviderStore.getState().getApiKey(provider.id);

        if (provider.type === 'zeroclaw') {
          gen = streamZeroClawChat(
            provider.url,
            apiKey || undefined,
            messages.map((m) => ({
              role: m.role as 'user' | 'assistant' | 'system',
              content: m.content,
            }))
          );
        } else if (provider.type === 'ollama-cloud' || provider.type === 'ollama-local') {
          gen = streamChat(provider.url, apiKey || undefined, {
            model,
            messages: messages.map((m) => ({
              role: m.role as 'user' | 'assistant' | 'system',
              content: m.content,
            })),
            stream: true,
          });
        } else {
          throw new Error(`Provider type ${provider.type} does not support streaming chat yet`);
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
