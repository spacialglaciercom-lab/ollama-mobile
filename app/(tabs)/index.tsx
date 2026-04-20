import React, { useEffect } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Text,
  Alert,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { useChatStore } from '../../src/store/useChatStore';
import { useModelStore } from '../../src/store/useModelStore';
import { useServerStore } from '../../src/store/useServerStore';

export default function ChatListScreen() {
  const { conversations, loadConversations, deleteConversation, setActiveConversation } =
    useChatStore();
  const { selectedModel } = useModelStore();
  const activeServer = useServerStore((s) => s.getActiveServer());

  useEffect(() => {
    loadConversations();
  }, []);

  const handleNewChat = () => {
    if (!selectedModel) {
      Alert.alert('No Model Selected', 'Go to Models tab to select a model first.');
      return;
    }
    router.push({
      pathname: '/chat/[id]',
      params: { id: 'new', model: selectedModel },
    });
  };

  const handleOpenChat = (id: string) => {
    setActiveConversation(id);
    router.push(`/chat/${id}`);
  };

  const handleDeleteChat = (id: string) => {
    Alert.alert('Delete Chat', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteConversation(id),
      },
    ]);
  };

  const renderChat = ({ item }: { item: (typeof conversations)[0] }) => (
    <TouchableOpacity
      style={styles.chatCard}
      onPress={() => handleOpenChat(item.id)}
      onLongPress={() => handleDeleteChat(item.id)}
      activeOpacity={0.7}
    >
      <Text style={styles.chatTitle} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.chatMeta}>
        {item.model} · {new Date(item.updatedAt).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chats</Text>
        {activeServer && (
          <View style={styles.serverBadge}>
            <View style={styles.serverDot} />
            <Text style={styles.serverName}>{activeServer.name}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderChat}
        contentContainerStyle={conversations.length === 0 ? styles.emptyList : undefined}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No conversations yet</Text>
            <Text style={styles.emptySubtext}>
              Tap + to start a new chat
            </Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={handleNewChat}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { color: '#fff', fontSize: 28, fontWeight: '700' },
  serverBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  serverDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ade80',
    marginRight: 6,
  },
  serverName: { color: '#aaa', fontSize: 13 },
  chatCard: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
  },
  chatTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  chatMeta: { color: '#888', fontSize: 13, marginTop: 4 },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { color: '#666', fontSize: 18 },
  emptySubtext: { color: '#444', fontSize: 14, marginTop: 4 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '600' },
});