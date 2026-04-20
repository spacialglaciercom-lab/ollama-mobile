import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useChatStore } from '../../src/store/useChatStore';
import { useModelStore } from '../../src/store/useModelStore';
import { useServerStore } from '../../src/store/useServerStore';
import { useOllamaStream } from '../../src/hooks/useOllamaStream';
import { MessageBubble } from '../../src/components/chat/MessageBubble';
import { StreamingBubble } from '../../src/components/chat/StreamingBubble';
import { ChatInput } from '../../src/components/chat/ChatInput';
import { StoredMessage } from '../../src/api/types';

export default function ChatScreen() {
  const { id, model: paramModel } = useLocalSearchParams<{ id: string; model?: string }>();
  const {
    conversations,
    messages,
    activeConversationId,
    createConversation,
    addMessage,
    setActiveConversation,
    loadMessages,
  } = useChatStore();
  const { selectedModel, models, selectModel } = useModelStore();
  const activeServer = useServerStore((s) => s.getActiveServer());
  const { sendMessage, streaming } = useOllamaStream();

  const [streamingContent, setStreamingContent] = useState('');
  const [localMessages, setLocalMessages] = useState<StoredMessage[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const conversationRef = useRef<string | null>(null);

  // Initialize conversation
  useEffect(() => {
    if (id === 'new') {
      const model = paramModel || selectedModel || 'gpt-oss:120b';
      createConversation('New Chat', model).then((conv) => {
        conversationRef.current = conv.id;
        router.replace(`/chat/${conv.id}`);
      });
    } else if (id) {
      conversationRef.current = id;
      setActiveConversation(id);
      loadMessages(id).then(() => {
        const conv = conversations.find((c) => c.id === id);
        if (conv) selectModel(conv.model);
      });
    }
  }, [id]);

  // Sync local messages with store
  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (localMessages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
    }
  }, [localMessages.length, streamingContent]);

  const handleSend = useCallback(
    async (text: string) => {
      if (!text.trim() || !conversationRef.current || !selectedModel) return;

      const convId = conversationRef.current;

      // Add user message
      const userMsg = await addMessage(convId, 'user', text.trim());
      setLocalMessages((prev) => [...prev, userMsg]);

      // Build messages array for API
      const conv = conversations.find((c) => c.id === convId);
      const apiMessages = [
        ...(conv?.systemPrompt
          ? [{ role: 'system' as const, content: conv.systemPrompt }]
          : []),
        ...localMessages
          .filter((m) => m.role !== 'system')
          .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user' as const, content: text.trim() },
      ];

      setStreamingContent('');

      // Stream response
      await sendMessage(
        selectedModel,
        apiMessages,
        (token) => {
          setStreamingContent((prev) => prev + token);
        },
        async () => {
          const finalContent = streamingContent;
          setStreamingContent('');
          const assistantMsg = await addMessage(convId, 'assistant', finalContent);
          setLocalMessages((prev) => [...prev, assistantMsg]);
        }
      );
    },
    [selectedModel, localMessages, conversations, addMessage, sendMessage]
  );

  const allMessages = [
    ...localMessages,
    ...(streamingContent
      ? [
          {
            id: 'streaming',
            conversationId: conversationRef.current ?? '',
            role: 'assistant' as const,
            content: streamingContent,
            createdAt: Date.now(),
          },
        ]
      : []),
  ];

  const currentModel = selectedModel || paramModel || 'No model';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.modelName} numberOfLines={1}>
          {currentModel}
        </Text>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: activeServer ? '#4ade80' : '#f87171' },
            ]}
          />
          <Text style={styles.statusText}>
            {activeServer?.name ?? 'No server'}
          </Text>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={allMessages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) =>
          item.id === 'streaming' ? (
            <StreamingBubble text={item.content} isStreaming={streaming} />
          ) : (
            <MessageBubble role={item.role} content={item.content} />
          )
        }
        contentContainerStyle={styles.messageList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Start a conversation</Text>
            <Text style={styles.emptySub}>
              Send a message to begin chatting with {currentModel}
            </Text>
          </View>
        }
      />

      <ChatInput onSend={handleSend} disabled={streaming} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomColor: '#1a1a1a',
    borderBottomWidth: 1,
  },
  modelName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { color: '#888', fontSize: 12 },
  messageList: { paddingBottom: 16, paddingHorizontal: 16 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyTitle: { color: '#666', fontSize: 20, fontWeight: '600' },
  emptySub: { color: '#444', fontSize: 14, marginTop: 4, textAlign: 'center' },
});