import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
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
  Pressable,
  Alert,
} from 'react-native';

import { StoredMessage } from '../../src/api/types';
import { MessageActionSheet } from '../../src/components/MessageActionSheet';
import { ModelPickerSheet } from '../../src/components/ModelPickerSheet';
import { SettingsSheet } from '../../src/components/SettingsSheet';
import { MessageBubble } from '../../src/components/chat/MessageBubble';
import { StreamingBubble } from '../../src/components/chat/StreamingBubble';
import { useOllamaStream } from '../../src/hooks/useOllamaStream';
import { useChatStore } from '../../src/store/useChatStore';
import { useModelStore } from '../../src/store/useModelStore';
import { useServerStore } from '../../src/store/useServerStore';

export default function ChatScreen() {
  const { id, model: paramModel } = useLocalSearchParams<{ id: string; model?: string }>();
  const {
    conversations,
    messages,
    createConversation,
    addMessage,
    setActiveConversation,
    loadMessages,
    updateConversationTitle,
  } = useChatStore();
  const { selectedModel, selectModel, fetchModels } = useModelStore();
  const activeServer = useServerStore((s) => s.getActiveServer());
  const { sendMessage, streaming } = useOllamaStream();

  const [streamingContent, setStreamingContent] = useState('');
  const [localMessages, setLocalMessages] = useState<StoredMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [systemPromptText, setSystemPromptText] = useState('');
  const [tokenStats, setTokenStats] = useState<{ promptEval: number; eval: number } | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<StoredMessage | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const conversationRef = useRef<string | null>(null);
  const streamingContentRef = useRef('');

  useEffect(() => {
    streamingContentRef.current = streamingContent;
  }, [streamingContent]);

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
        if (conv) {
          selectModel(conv.model);
          if (conv.systemPrompt) {
            setSystemPromptText(conv.systemPrompt);
            setShowSystemPrompt(true);
          }
        }
      });
    }
  }, [
    id,
    conversations,
    createConversation,
    loadMessages,
    paramModel,
    selectModel,
    selectedModel,
    setActiveConversation,
  ]);

  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  useEffect(() => {
    if (localMessages.length > 0 || streamingContent) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [localMessages.length, streamingContent]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !conversationRef.current || !selectedModel || streaming) return;

    setInputText('');
    setTokenStats(null);

    const convId = conversationRef.current;

    // Add system prompt message if set
    if (showSystemPrompt && systemPromptText.trim()) {
      await addMessage(convId, 'system', systemPromptText.trim());
    }

    // Add user message
    const userMsg = await addMessage(convId, 'user', text);
    setLocalMessages((prev) => [...prev, userMsg]);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Build messages array for API
    const apiMessages: { role: string; content: string }[] = [];
    if (showSystemPrompt && systemPromptText.trim()) {
      apiMessages.push({ role: 'system', content: systemPromptText.trim() });
    }
    localMessages
      .filter((m) => m.role !== 'system')
      .forEach((msg) => apiMessages.push({ role: msg.role, content: msg.content }));
    apiMessages.push({ role: 'user', content: text });

    setStreamingContent('');

    await sendMessage(
      selectedModel,
      apiMessages,
      (fullContent) => {
        setStreamingContent(fullContent);
      },
      async () => {
        const finalContent = streamingContentRef.current;
        setStreamingContent('');
        if (finalContent) {
          const assistantMsg = await addMessage(convId, 'assistant', finalContent);
          setLocalMessages((prev) => [...prev, assistantMsg]);
        }
      }
    );

    // Auto-title from first user message
    const conv = useChatStore.getState().conversations.find((c) => c.id === convId);
    if (conv && conv.title === 'New Chat') {
      const title = text.length > 50 ? text.slice(0, 50) + '...' : text;
      updateConversationTitle(convId, title);
    }
  }, [
    inputText,
    selectedModel,
    localMessages,
    streaming,
    addMessage,
    sendMessage,
    systemPromptText,
    showSystemPrompt,
    updateConversationTitle,
  ]);

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

  const currentModel = selectedModel || paramModel || 'Select model';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="light" />

      {/* Nav Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.navBtn}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Text style={styles.navBtnText}>‹ Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.modelPill}
          onPress={() => setShowModelPicker(true)}
          accessibilityLabel={`Current model: ${currentModel}. Tap to change.`}
          accessibilityRole="button"
        >
          <Text style={styles.modelPillText} numberOfLines={1}>
            {currentModel}
          </Text>
          <Text style={styles.modelPillCaret}>▼</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => setShowMenu(!showMenu)}
          accessibilityLabel="More options"
          accessibilityRole="button"
        >
          <Text style={styles.navBtnIcon}>···</Text>
        </TouchableOpacity>
      </View>

      {/* Menu Popover */}
      {showMenu && (
        <Pressable style={styles.menuScrim} onPress={() => setShowMenu(false)}>
          <View style={styles.menuPopover}>
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => {
                setShowMenu(false);
                setShowSettings(true);
              }}
            >
              <Text style={styles.menuLabel}>Settings</Text>
            </TouchableOpacity>
            <View style={styles.menuSep} />
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => {
                setShowMenu(false);
                if (activeServer) fetchModels();
              }}
            >
              <Text style={styles.menuLabelAccent}>Refresh Models</Text>
            </TouchableOpacity>
            <View style={styles.menuSep} />
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => {
                setShowMenu(false);
                setShowSystemPrompt(!showSystemPrompt);
              }}
            >
              <Text style={styles.menuLabel}>System Prompt</Text>
            </TouchableOpacity>
            <View style={styles.menuSep} />
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => {
                setShowMenu(false);
                Alert.alert('Clear Chat', 'Clear this conversation?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Clear', style: 'destructive' },
                ]);
              }}
            >
              <Text style={styles.menuLabelDanger}>Clear Chat</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      )}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={allMessages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          if (item.id === 'streaming') {
            return <StreamingBubble content={item.content} />;
          }
          return (
            <MessageBubble
              role={item.role}
              content={item.content}
              selected={selectedMessage?.id === item.id}
              onLongPress={() => setSelectedMessage(item)}
            />
          );
        }}
        contentContainerStyle={
          allMessages.length === 0 ? styles.messagesEmpty : styles.messagesList
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Start a conversation</Text>
            <Text style={styles.emptySub}>Send a message to begin chatting</Text>
          </View>
        }
      />

      {/* Token stats */}
      {tokenStats && !streaming && (
        <View style={styles.tokenBar}>
          <Text style={styles.tokenText}>
            Prompt: {tokenStats.promptEval} · Response: {tokenStats.eval}
          </Text>
        </View>
      )}

      {/* System prompt area */}
      {showSystemPrompt && (
        <View style={styles.sysPromptArea}>
          <TextInput
            style={styles.sysPromptInput}
            value={systemPromptText}
            onChangeText={setSystemPromptText}
            placeholder="System prompt (optional)..."
            placeholderTextColor="rgba(235,235,245,0.18)"
            multiline
          />
        </View>
      )}

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.inputField}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Message..."
            placeholderTextColor="rgba(235,235,245,0.3)"
            multiline
            maxLength={4000}
            editable={!streaming}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              inputText.trim() && !streaming ? styles.sendBtnActive : styles.sendBtnInactive,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || streaming}
            accessibilityLabel="Send message"
            accessibilityRole="button"
            accessibilityHint="Sends your message to the AI"
          >
            <Text style={styles.sendBtnIcon}>↑</Text>
          </TouchableOpacity>
        </View>

        {/* Context chips */}
        <View style={styles.chips}>
          {activeServer && (
            <View style={styles.chip}>
              <Text style={styles.chipText}>🟢 {activeServer.name}</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.chipFaint}
            onPress={() => setShowSystemPrompt(!showSystemPrompt)}
          >
            <Text style={styles.chipFaintText}>
              {showSystemPrompt ? '✕ System' : '+ System prompt'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.chipFaint}>
            <Text style={styles.chipFaintText}>+ Add context</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Model Picker Sheet */}
      <ModelPickerSheet visible={showModelPicker} onClose={() => setShowModelPicker(false)} />

      {/* Settings Sheet */}
      <SettingsSheet visible={showSettings} onClose={() => setShowSettings(false)} />

      {/* Message Actions */}
      <MessageActionSheet
        visible={!!selectedMessage}
        onClose={() => setSelectedMessage(null)}
        content={selectedMessage?.content ?? ''}
        role={selectedMessage?.role ?? 'assistant'}
        onRegenerate={() => {
          setSelectedMessage(null);
          // Re-send last user message
          const lastUserMsg = [...localMessages].reverse().find((m) => m.role === 'user');
          if (lastUserMsg) {
            setInputText(lastUserMsg.content);
          }
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 56,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(84,84,88,0.65)',
  },
  navBtn: { padding: 8 },
  navBtnText: { color: '#0a84ff', fontSize: 17 },
  navBtnIcon: { color: '#0a84ff', fontSize: 22, fontWeight: '700' },
  modelPill: {
    backgroundColor: '#1c1c1e',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 200,
  },
  modelPillText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  modelPillCaret: { color: 'rgba(235,235,245,0.3)', fontSize: 12 },
  menuScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
  },
  menuPopover: {
    position: 'absolute',
    top: 96,
    right: 16,
    width: 220,
    backgroundColor: 'rgba(44,44,46,0.97)',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.7,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 20 },
    elevation: 10,
  },
  menuRow: { paddingHorizontal: 16, paddingVertical: 11 },
  menuLabel: { color: '#fff', fontSize: 17 },
  menuLabelAccent: { color: '#30d158', fontSize: 17 },
  menuLabelDanger: { color: '#ff453a', fontSize: 17 },
  menuSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(84,84,88,0.65)',
    marginHorizontal: 12,
  },
  messagesList: { paddingHorizontal: 16, paddingVertical: 12 },
  messagesEmpty: { flexGrow: 1, justifyContent: 'center' },
  emptyState: { alignItems: 'center' },
  emptyTitle: {
    color: 'rgba(235,235,245,0.3)',
    fontSize: 20,
    fontWeight: '600',
  },
  emptySub: {
    color: 'rgba(235,235,245,0.18)',
    fontSize: 15,
    marginTop: 4,
    textAlign: 'center',
  },
  bubbleWrap: { marginBottom: 8 },
  bubbleWrapUser: { alignSelf: 'flex-end', maxWidth: '80%' },
  bubbleWrapAssistant: { alignSelf: 'flex-start', maxWidth: '80%' },
  bubbleWrapSystem: { alignSelf: 'center', maxWidth: '90%' },
  bubbleWrapSelected: {
    borderWidth: 1.5,
    borderColor: '#30d158',
    borderRadius: 18,
  },
  bubble: { paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser: {
    backgroundColor: '#1a3a5c',
    borderRadius: 18,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: '#1c1c1e',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
  },
  bubbleSystem: {
    backgroundColor: 'rgba(48,209,88,0.08)',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(48,209,88,0.2)',
  },
  bubbleText: { color: '#fff', fontSize: 15, lineHeight: 21 },
  bubbleSystemText: {
    color: 'rgba(48,209,88,0.7)',
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  cursor: { color: '#30d158', fontSize: 14, marginTop: 2 },
  tokenBar: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  tokenText: { color: 'rgba(235,235,245,0.3)', fontSize: 12 },
  sysPromptArea: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 48,
  },
  sysPromptInput: {
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: 'rgba(48,209,88,0.7)',
    minHeight: 48,
    maxHeight: 100,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(48,209,88,0.2)',
  },
  inputBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(84,84,88,0.65)',
    backgroundColor: '#000',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 10,
  },
  inputField: {
    flex: 1,
    backgroundColor: '#1c1c1e',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 15,
    color: '#fff',
    minHeight: 38,
    maxHeight: 120,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: { backgroundColor: '#30d158' },
  sendBtnInactive: { backgroundColor: '#2c2c2e', opacity: 0.5 },
  sendBtnIcon: { color: '#fff', fontSize: 18, fontWeight: '700' },
  chips: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 20,
    paddingTop: 2,
    gap: 8,
  },
  chip: {
    backgroundColor: '#1c1c1e',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: { color: 'rgba(235,235,245,0.8)', fontSize: 13 },
  chipFaint: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    borderStyle: 'dashed',
  },
  chipFaintText: { color: 'rgba(235,235,245,0.3)', fontSize: 13 },
});
