import { useEffect } from 'react';

import { useChatStore } from '../store/useChatStore';

export function useConversation(conversationId: string | null) {
  const { loadMessages, messages, conversations } = useChatStore();

  useEffect(() => {
    if (conversationId) {
      loadMessages(conversationId);
    }
  }, [conversationId]);

  const conversation = conversations.find((c) => c.id === conversationId);

  return {
    conversation,
    messages,
    isLoading: !conversation && !!conversationId,
  };
}
