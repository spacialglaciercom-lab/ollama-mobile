import { useEffect, useMemo } from 'react';

import { useChatStore } from '../store/useChatStore';

export function useConversation(conversationId: string | null) {
  const { loadMessages, messages, conversations } = useChatStore();

  useEffect(() => {
    if (conversationId) {
      loadMessages(conversationId);
    }
  }, [conversationId]);

  const conversation = useMemo(
    () => conversations.find((c) => c.id === conversationId),
    [conversations, conversationId]
  );

  return {
    conversation,
    messages,
    isLoading: !conversation && !!conversationId,
  };
}
