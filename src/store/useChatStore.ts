import { create } from 'zustand';

import { Conversation, StoredMessage } from '../api/types';
import * as db from '../db/schema';

const AUTO_DELETE_KEY = 'ollama-auto-delete-days';
const AUTO_SAVE_KEY = 'ollama-auto-save-enabled';

interface ChatStore {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: StoredMessage[];
  loading: boolean;
  autoSaveEnabled: boolean;
  autoDeleteDays: number;

  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  createConversation: (
    title: string,
    model: string,
    systemPrompt?: string
  ) => Promise<Conversation>;
  deleteConversation: (id: string) => Promise<void>;
  setActiveConversation: (id: string | null) => void;
  addMessage: (
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    thought?: string
  ) => Promise<StoredMessage>;
  updateConversationTitle: (id: string, title: string) => Promise<void>;
  searchConversations: (query: string) => Promise<Conversation[]>;
  setAutoSave: (enabled: boolean) => void;
  setAutoDeleteDays: (days: number) => void;
  cleanupOldConversations: () => Promise<void>;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  loading: false,
  autoSaveEnabled: true,
  autoDeleteDays: 0,

  loadConversations: async () => {
    set({ loading: true });
    try {
      const conversations = await db.getConversations();
      set({ conversations, loading: false });
    } catch (err) {
      console.error('Failed to load conversations:', err);
      set({ loading: false });
    }
  },

  loadMessages: async (conversationId) => {
    try {
      const messages = await db.getMessages(conversationId);
      set({ messages });
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  },

  createConversation: async (title, model, systemPrompt) => {
    const conversation: Conversation = {
      id: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      title,
      model,
      systemPrompt,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.insertConversation(conversation);

    if (systemPrompt) {
      await db.insertMessage({
        id: `msg-${Date.now()}-0`,
        conversationId: conversation.id,
        role: 'system',
        content: systemPrompt,
        createdAt: Date.now(),
      });
    }

    set((state) => ({
      conversations: [conversation, ...state.conversations],
      activeConversationId: conversation.id,
      messages: systemPrompt
        ? [
            {
              id: `msg-${Date.now()}-0`,
              conversationId: conversation.id,
              role: 'system',
              content: systemPrompt,
              createdAt: Date.now(),
            },
          ]
        : [],
    }));

    return conversation;
  },

  deleteConversation: async (id) => {
    try {
      await db.deleteConversation(id);
      set((state) => ({
        conversations: state.conversations.filter((c) => c.id !== id),
        activeConversationId: state.activeConversationId === id ? null : state.activeConversationId,
        messages: state.activeConversationId === id ? [] : state.messages,
      }));
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  },

  setActiveConversation: (id) => {
    set({ activeConversationId: id });
    if (id) {
      get().loadMessages(id);
    } else {
      set({ messages: [] });
    }
  },

  addMessage: async (conversationId, role, content, thought) => {
    const message: StoredMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      conversationId,
      role,
      content,
      thought,
      createdAt: Date.now(),
    };

    try {
      await db.insertMessage(message);
      await db.updateConversationTimestamp(conversationId, Date.now());

      if (get().activeConversationId === conversationId) {
        set((state) => ({
          messages: [...state.messages, message],
        }));
      }

      return message;
    } catch (err) {
      console.error('Failed to add message:', err);
      return message;
    }
  },

  updateConversationTitle: async (id, title) => {
    try {
      await db.updateConversationTitle(id, title);
      set((state) => ({
        conversations: state.conversations.map((c) => (c.id === id ? { ...c, title } : c)),
      }));
    } catch (err) {
      console.error('Failed to update title:', err);
    }
  },

  searchConversations: async (query) => {
    if (!query.trim()) {
      return get().conversations;
    }
    return db.searchConversations(query);
  },

  setAutoSave: (enabled) => {
    set({ autoSaveEnabled: enabled });
  },

  setAutoDeleteDays: (days) => {
    set({ autoDeleteDays: days });
  },

  cleanupOldConversations: async () => {
    const days = get().autoDeleteDays;
    if (days <= 0) return;

    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    try {
      await db.deleteConversationsOlderThan(cutoff);
      await get().loadConversations();
    } catch (err) {
      console.error('Cleanup failed:', err);
    }
  },
}));
