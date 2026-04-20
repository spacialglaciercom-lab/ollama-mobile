import React, { useState } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  Modal,
} from 'react-native';
import { useServerStore, Server } from '../../src/store/useServerStore';
import { pingServer } from '../../src/api/ollamaClient';

export default function SettingsScreen() {
  const { servers, activeServerId, addServer, updateServer, removeServer, setActive } =
    useServerStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [pinging, setPinging] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');

  const handleAdd = () => {
    setEditingServer(null);
    setName('');
    setUrl('');
    setApiKey('');
    setShowAddModal(true);
  };

  const handleEdit = (server: Server) => {
    setEditingServer(server);
    setName(server.name);
    setUrl(server.url);
    setApiKey(server.apiKey ?? '');
    setShowAddModal(true);
  };

  const handleSave = () => {
    if (!name.trim() || !url.trim()) {
      Alert.alert('Missing fields', 'Name and URL are required.');
      return;
    }

    if (editingServer) {
      updateServer(editingServer.id, { name: name.trim(), url: url.trim(), apiKey: apiKey.trim() || undefined });
    } else {
      addServer({
        name: name.trim(),
        url: url.trim(),
        apiKey: apiKey.trim() || undefined,
        isCloud: url.trim().includes('ollama.com'),
      });
    }
    setShowAddModal(false);
  };

  const handlePing = async (server: Server) => {
    setPinging(server.id);
    const alive = await pingServer(server.url, server.apiKey);
    setPinging(null);
    Alert.alert(
      alive ? 'Connected ✅' : 'Failed ❌',
      alive ? `${server.name} is reachable.` : `Could not reach ${server.name}.`
    );
  };

  const handleDelete = (server: Server) => {
    if (server.id === 'ollama-cloud') {
      Alert.alert('Cannot Delete', 'The default Ollama Cloud server cannot be removed.');
      return;
    }
    Alert.alert('Remove Server', `Remove ${server.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeServer(server.id) },
    ]);
  };

  const renderServer = ({ item }: { item: Server }) => (
    <TouchableOpacity
      style={[
        styles.serverCard,
        item.id === activeServerId && styles.serverCardActive,
      ]}
      onPress={() => setActive(item.id)}
      onLongPress={() => handleEdit(item)}
      activeOpacity={0.7}
    >
      <View style={styles.serverInfo}>
        <View style={styles.serverHeader}>
          <Text style={styles.serverName}>{item.name}</Text>
          {item.isCloud && (
            <View style={styles.cloudBadge}>
              <Text style={styles.cloudBadgeText}>Cloud</Text>
            </View>
          )}
        </View>
        <Text style={styles.serverUrl}>{item.url}</Text>
        {item.apiKey && (
          <Text style={styles.serverKey}>API key: ••••{item.apiKey.slice(-4)}</Text>
        )}
      </View>

      <View style={styles.serverActions}>
        <TouchableOpacity
          style={styles.pingButton}
          onPress={() => handlePing(item)}
        >
          <Text style={styles.pingText}>
            {pinging === item.id ? '...' : 'Ping'}
          </Text>
        </TouchableOpacity>
        {item.id !== 'ollama-cloud' && (
          <TouchableOpacity onPress={() => handleDelete(item)}>
            <Text style={styles.deleteText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
          <Text style={styles.addButtonText}>+ Server</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Servers</Text>
      <Text style={styles.sectionHint}>Tap to select, long-press to edit</Text>

      <FlatList
        data={servers}
        keyExtractor={(item) => item.id}
        renderItem={renderServer}
        contentContainerStyle={styles.listContent}
      />

      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingServer ? 'Edit Server' : 'Add Server'}
            </Text>

            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="My Ollama Server"
              placeholderTextColor="#666"
            />

            <Text style={styles.label}>URL</Text>
            <TextInput
              style={styles.input}
              value={url}
              onChangeText={setUrl}
              placeholder="https://ollama.com or http://192.168.1.100:11434"
              placeholderTextColor="#666"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <Text style={styles.label}>API Key (optional)</Text>
            <TextInput
              style={styles.input}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="Required for Ollama Cloud"
              placeholderTextColor="#666"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  addButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '600', paddingHorizontal: 16 },
  sectionHint: { color: '#666', fontSize: 13, paddingHorizontal: 16, marginBottom: 8 },
  listContent: { paddingBottom: 20 },
  serverCard: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serverCardActive: { borderColor: '#8B5CF6', borderWidth: 1 },
  serverInfo: { flex: 1 },
  serverHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  serverName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cloudBadge: {
    backgroundColor: '#2a1a4a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cloudBadgeText: { color: '#8B5CF6', fontSize: 11, fontWeight: '600' },
  serverUrl: { color: '#888', fontSize: 13, marginTop: 2 },
  serverKey: { color: '#555', fontSize: 12, marginTop: 2 },
  serverActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pingButton: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  pingText: { color: '#aaa', fontSize: 13 },
  deleteText: { color: '#f87171', fontSize: 18 },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 20 },
  label: { color: '#aaa', fontSize: 14, marginTop: 12, marginBottom: 4 },
  input: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelButton: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelText: { color: '#aaa', fontSize: 16 },
  saveButton: {
    flex: 1,
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});