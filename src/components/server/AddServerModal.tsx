import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet } from 'react-native';

interface AddServerModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (server: { name: string; url: string; apiKey?: string; isCloud: boolean }) => void;
  initialValues?: { name: string; url: string; apiKey?: string };
}

export function AddServerModal({ visible, onClose, onSave, initialValues }: AddServerModalProps) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [url, setUrl] = useState(initialValues?.url ?? '');
  const [apiKey, setApiKey] = useState(initialValues?.apiKey ?? '');

  const handleSave = () => {
    if (!name.trim() || !url.trim()) return;
    onSave({
      name: name.trim(),
      url: url.trim(),
      apiKey: apiKey.trim() || undefined,
      isCloud: url.trim().includes('ollama.com'),
    });
    setName('');
    setUrl('');
    setApiKey('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>Add Server</Text>

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

          <Text style={styles.label}>API Key (optional, required for Cloud)</Text>
          <TextInput
            style={styles.input}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="Your Ollama API key"
            placeholderTextColor="#666"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  content: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 20 },
  label: { color: '#aaa', fontSize: 14, marginTop: 12, marginBottom: 4 },
  input: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  buttons: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelText: { color: '#aaa', fontSize: 16 },
  saveBtn: {
    flex: 1,
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});