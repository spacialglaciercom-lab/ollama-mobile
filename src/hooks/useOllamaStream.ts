import { useState, useCallback } from 'react';

import { streamChat } from '../api/ollamaClient';
import { streamZeroClawChat } from '../api/zeroclawClient';
import { useServerStore, buildServerUrl } from '../store/useServerStore';
import { useProviderStore } from '../store/useProviderStore';
import { getProviderApiKey } from '../api/providerFactory';

interface UseOllamaStreamReturn {
  sendMessage: (
    model: string,
    messages: { role: string; content: string }[],
    onContent: (fullContent: string, thought?: string) => void,
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
      onContent: (fullContent: string, thought?: string) => void,
      onDone: () => void
    ) => {
      // 1. Try unified provider store first
      const activeProvider = useProviderStore.getState().getActiveProvider();
      let server;
      let apiKey: string | undefined;
      let type: string;
      let serverUrl: string;

      if (activeProvider) {
        type = activeProvider.type;
        serverUrl = (activeProvider as any).url || '';
        apiKey = (await getProviderApiKey(activeProvider.type, activeProvider.id)) || undefined;
      } else {
        // 2. Fallback to legacy server store
        server = useServerStore.getState().getActiveServer();
        if (!server) {
          setError('No active server or provider configured');
          onDone();
          return;
        }
        type = server.type;
        serverUrl = buildServerUrl(server);
        apiKey = server.apiKey;
      }

      setStreaming(true);
      setError(null);

      let fullContent = '';
      let fullThought = '';

      try {
        let gen;
        if (type === 'zeroclaw') {
          gen = streamZeroClawChat(
            serverUrl,
            apiKey,
            messages.map((m) => ({
              role: m.role as 'user' | 'assistant' | 'system',
              content: m.content,
            }))
          );
        } else if (type === 'jules') {
          // Jules support if needed - but Jules often has its own specialized hook/flow
          // For now, we'll focus on ZeroClaw and Ollama
          throw new Error('Jules streaming not yet implemented in unified hook');
        } else {
          // Default to Ollama (ollama-local or ollama-cloud)
          gen = streamChat(serverUrl, apiKey, {
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
          }
          if (chunk.message?.thought) {
            fullThought += chunk.message.thought;
          }

          if (chunk.message?.content || chunk.message?.thought) {
            onContent(fullContent, fullThought || undefined);
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
