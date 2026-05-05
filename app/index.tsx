import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';

import { ConversationList } from '../src/components/ConversationList';
import { useChatStore } from '../src/store/useChatStore';
import { useModelStore } from '../src/store/useModelStore';
import { useServerStore } from '../src/store/useServerStore';
import { exportConversationAsMarkdown } from '../src/utils/exportConversation';

type Tab = 'chats' | 'repos';

export default function HomeScreen() {
  const {
    conversations,
    loadConversations,
    deleteConversation,
    updateConversationTitle,
    cleanupOldConversations,
    messages,
  } = useChatStore();
  const { selectedModel, fetchModels } = useModelStore();
  const activeServer = useServerStore((s) => s.getActiveServer());
  const [tab, setTab] = useState<Tab>('chats');

  useEffect(() => {
    loadConversations();
    cleanupOldConversations();
    if (activeServer) fetchModels();
  }, [activeServer, fetchModels, loadConversations, cleanupOldConversations]);

  const handleNewChat = () => {
    router.push({
      pathname: '/chat/[id]',
      params: { id: 'new', model: selectedModel || 'gpt-oss:120b' },
    });
  };

  const handleOpenChat = (id: string) => {
    router.push(`/chat/${id}`);
  };

  const handleDeleteChat = (id: string) => {
    Alert.alert('Delete Chat', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteConversation(id) },
    ]);
  };

  const handleRenameChat = async (id: string, newTitle: string) => {
    await updateConversationTitle(id, newTitle);
  };

  const handleExportChat = async (conversation: (typeof conversations)[0]) => {
    const convMessages = messages.filter((m) => m.conversationId === conversation.id);
    await exportConversationAsMarkdown(conversation, convMessages);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.navBar}>
        <Text style={styles.navTitle}>Ollama</Text>
        {tab === 'chats' && (
          <TouchableOpacity style={styles.newChatBtn} onPress={handleNewChat}>
            <Text style={styles.newChatBtnIcon}>+</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, tab === 'chats' && styles.tabActive]}
          onPress={() => setTab('chats')}
        >
          <Text style={[styles.tabText, tab === 'chats' && styles.tabTextActive]}>Chats</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'repos' && styles.tabActive]}
          onPress={() => router.push('/repos')}
        >
          <Text style={[styles.tabText, tab === 'repos' && styles.tabTextActive]}>Repos</Text>
        </TouchableOpacity>
      </View>

      <ConversationList
        conversations={conversations}
        onOpenChat={handleOpenChat}
        onDeleteChat={handleDeleteChat}
        onRenameChat={handleRenameChat}
        onExportChat={handleExportChat}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
  },
  navTitle: { color: '#fff', fontSize: 34, fontWeight: '700' },
  newChatBtn: { padding: 8 },
  newChatBtnIcon: { fontSize: 24, color: '#30d158', fontWeight: '700' },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(84,84,88,0.65)',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#30d158',
  },
  tabText: {
    color: 'rgba(235,235,245,0.3)',
    fontSize: 15,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
});
