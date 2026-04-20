import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useChatStore } from '../src/store/useChatStore';
import { useModelStore } from '../src/store/useModelStore';
import { useServerStore } from '../src/store/useServerStore';

export default function HomeScreen() {
  const { conversations, loadConversations, deleteConversation } = useChatStore();
  const { selectedModel, fetchModels } = useModelStore();
  const activeServer = useServerStore((s) => s.getActiveServer());

  useEffect(() => {
    loadConversations();
    if (activeServer) fetchModels();
  }, [activeServer?.id]);

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

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderChat = ({ item }: { item: (typeof conversations)[0] }) => (
    <TouchableOpacity
      style={styles.chatCard}
      onPress={() => handleOpenChat(item.id)}
      onLongPress={() => handleDeleteChat(item.id)}
      activeOpacity={0.6}
    >
      <View style={styles.chatCardContent}>
        <Text style={styles.chatTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.chatModel}>{item.model}</Text>
      </View>
      <Text style={styles.chatTime}>{formatTime(item.updatedAt)}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.navBar}>
        <Text style={styles.navTitle}>Ollama</Text>
        <TouchableOpacity style={styles.newChatBtn} onPress={handleNewChat}>
          <Text style={styles.newChatBtnIcon}>✏️</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderChat}
        contentContainerStyle={conversations.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No conversations</Text>
            <Text style={styles.emptySub}>Tap ✏️ to start a new chat</Text>
          </View>
        }
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(84,84,88,0.65)',
  },
  navTitle: { color: '#fff', fontSize: 34, fontWeight: '700' },
  newChatBtn: { padding: 8 },
  newChatBtnIcon: { fontSize: 20 },
  list: { paddingHorizontal: 16, paddingTop: 8 },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  emptyState: { alignItems: 'center' },
  emptyTitle: { color: 'rgba(235,235,245,0.3)', fontSize: 20, fontWeight: '600' },
  emptySub: { color: 'rgba(235,235,245,0.18)', fontSize: 15, marginTop: 4 },
  chatCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatCardContent: { flex: 1 },
  chatTitle: { color: '#fff', fontSize: 17, fontWeight: '500' },
  chatModel: { color: 'rgba(235,235,245,0.3)', fontSize: 13, marginTop: 2 },
  chatTime: { color: 'rgba(235,235,245,0.3)', fontSize: 15, marginLeft: 12 },
});