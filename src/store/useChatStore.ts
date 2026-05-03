import { MMKV } from 'react-native-mmkv';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { Conversation, StoredMessage } from '../api/types';
import * as db from '../db/schema';

const storage = new MMKV();

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
    content: string
  ) => Promise<StoredMessage>;
  updateConversationTitle: (id: string, title: string) => Promise<void>;
  searchConversations: (query: string) => Promise<Conversation[]>;
  clearSearch: () => Promise<void>;
  setAutoSave: (enabled: boolean) => void;
  setAutoDeleteDays: (days: number) => void;
  cleanupOldConversations: () => Promise<void>;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
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
        await db.deleteConversation(id);
        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== id),
          activeConversationId:
            state.activeConversationId === id ? null : state.activeConversationId,
          messages: state.activeConversationId === id ? [] : state.messages,
        }));
      },

      setActiveConversation: (id) => {
        set({ activeConversationId: id });
        if (id) {
          get().loadMessages(id);
        } else {
          set({ messages: [] });
        }
      },

      addMessage: async (conversationId, role, content) => {
        const message: StoredMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          conversationId,
          role,
          content,
          createdAt: Date.now(),
        };

        await db.insertMessage(message);

        // Update conversation timestamp
        await db.updateConversationTimestamp(conversationId, Date.now());

        set((state) => ({
          messages: [...state.messages, message],
          conversations: state.conversations.map((c) =>
            c.id === conversationId ? { ...c, updatedAt: Date.now() } : c
          ),
        }));

        return message;
      },

      updateConversationTitle: async (id, title) => {
        await db.updateConversationTitle(id, title);
        set((state) => ({
          conversations: state.conversations.map((c) => (c.id === id ? { ...c, title } : c)),
        }));
      },

      searchConversations: async (query) => {
        const results = await db.searchConversations(query);
        set({ conversations: results });
        return results;
      },

      clearSearch: async () => {
        await get().loadConversations();
      },

      setAutoSave: (enabled) => {
        set({ autoSaveEnabled: enabled });
      },

      setAutoDeleteDays: (days) => {
        set({ autoDeleteDays: days });
      },

      cleanupOldConversations: async () => {
        const { autoDeleteDays } = get();
        if (autoDeleteDays === 0) return;

        const cutoff = Date.now() - autoDeleteDays * 24 * 60 * 60 * 1000;
        await db.deleteConversationsOlderThan(cutoff);
        await get().loadConversations();
      },
    }),
    {
      name: 'ollama-chat-settings',
      storage: createJSONStorage(() => ({
        getItem: (key) => storage.getString(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
        removeItem: (key) => storage.delete(key),
      })),
      partialize: (state) => ({
        autoSaveEnabled: state.autoSaveEnabled,
        autoDeleteDays: state.autoDeleteDays,
      }),
    }
  )
);
