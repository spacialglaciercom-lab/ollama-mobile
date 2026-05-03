import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  StyleSheet,
} from 'react-native';

import { Conversation } from '../api/types';
import { useChatStore } from '../store/useChatStore';

interface ConversationListProps {
  conversations: Conversation[];
  onOpenChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onRenameChat?: (id: string, newTitle: string) => void;
  onExportChat?: (conversation: Conversation) => void;
}

export function ConversationList({
  conversations,
  onOpenChat,
  onDeleteChat,
  onRenameChat,
  onExportChat,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [renameModal, setRenameModal] = useState<{ visible: boolean; id: string; title: string }>({
    visible: false,
    id: '',
    title: '',
  });
  const { searchConversations, clearSearch } = useChatStore();

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      await searchConversations(query);
    } else {
      await clearSearch();
    }
  };

  const handleLongPress = (conversation: Conversation) => {
    Alert.alert(
      conversation.title,
      undefined,
      [
        {
          text: 'Rename',
          onPress: () =>
            setRenameModal({ visible: true, id: conversation.id, title: conversation.title }),
        },
        {
          text: 'Export',
          onPress: () => onExportChat?.(conversation),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeleteChat(conversation.id),
        },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const handleRename = () => {
    if (renameModal.title.trim() && renameModal.id) {
      onRenameChat?.(renameModal.id, renameModal.title.trim());
      setRenameModal({ visible: false, id: '', title: '' });
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString())
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderChat = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.chatCard}
      onPress={() => onOpenChat(item.id)}
      onLongPress={() => handleLongPress(item)}
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
    <>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor="rgba(235,235,245,0.3)"
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>

      {/* Conversation List */}
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderChat}
        contentContainerStyle={conversations.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No matches found' : 'No conversations'}
            </Text>
            <Text style={styles.emptySub}>
              {searchQuery ? 'Try a different search term' : 'Tap + to start a new chat'}
            </Text>
          </View>
        }
      />

      {/* Rename Modal */}
      <Modal
        visible={renameModal.visible}
        animationType="fade"
        transparent
        onRequestClose={() => setRenameModal({ visible: false, id: '', title: '' })}
      >
        <TouchableOpacity
          style={styles.modalScrim}
          activeOpacity={1}
          onPress={() => setRenameModal({ visible: false, id: '', title: '' })}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rename Conversation</Text>
            <TextInput
              style={styles.modalInput}
              value={renameModal.title}
              onChangeText={(text) => setRenameModal({ ...renameModal, title: text })}
              placeholder="Enter new title"
              placeholderTextColor="rgba(235,235,245,0.3)"
              autoFocus
              selectTextOnFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setRenameModal({ visible: false, id: '', title: '' })}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleRename}
              >
                <Text style={styles.modalButtonText}>Rename</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 17,
    color: '#fff',
  },
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
  modalScrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    padding: 20,
    width: '85%',
    maxWidth: 340,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 17,
    color: '#fff',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#2c2c2e',
  },
  modalButtonConfirm: {
    backgroundColor: '#30d158',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
