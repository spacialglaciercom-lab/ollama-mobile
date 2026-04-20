import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
} from 'react-native';
import { useServerStore } from '../store/useServerStore';
import { createClient } from '../api/ollamaClient';

interface ModelPullSheetProps {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function ModelPullSheet({ visible, onClose, onComplete }: ModelPullSheetProps) {
  const activeServer = useServerStore((s) => s.getActiveServer());
  const [searchText, setSearchText] = useState('');
  const [pulling, setPulling] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handlePull = async (modelName: string) => {
    if (!activeServer || pulling) return;

    setPulling(modelName);
    setProgress(0);
    setStatus('Connecting...');
    setError(null);

    try {
      const cleanUrl = activeServer.url.replace(/\/+$/, '');
      const url = `${cleanUrl}/api/pull`;

      abortRef.current = new AbortController();

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeServer.apiKey
            ? { Authorization: `Bearer ${activeServer.apiKey}` }
            : {}),
        },
        body: JSON.stringify({ name: modelName, stream: true }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Pull failed: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.status) {
              setStatus(data.status);
            }
            if (data.total && data.completed) {
              setProgress(data.completed / data.total);
            }
          } catch {}
        }
      }

      setProgress(1);
      setStatus('Complete');
      onComplete();
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err?.message ?? 'Pull failed');
      }
    } finally {
      setPulling(null);
      abortRef.current = null;
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    setPulling(null);
    setProgress(0);
    setStatus('');
  };

  const handleClose = () => {
    handleCancel();
    setSearchText('');
    setError(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.scrim}>
        <TouchableOpacity style={styles.scrimTouch} onPress={handleClose} />
        <View style={styles.sheet}>
          <View style={styles.handle}>
            <View style={styles.handleBar} />
          </View>
          <View style={styles.sheetNav}>
            <Text style={styles.sheetTitle}>Pull Model</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.sheetDone}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Model name (e.g. llama3.2, mistral)"
              placeholderTextColor="rgba(235,235,245,0.18)"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!pulling}
            />
            {searchText.trim() && !pulling && (
              <TouchableOpacity
                style={styles.pullBtn}
                onPress={() => handlePull(searchText.trim())}
              >
                <Text style={styles.pullBtnText}>Pull</Text>
              </TouchableOpacity>
            )}
          </View>

          {pulling && (
            <View style={styles.progressSection}>
              <Text style={styles.pullingName}>{pulling}</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { flex: progress }]} />
                <View style={{ flex: 1 - progress }} />
              </View>
              <View style={styles.progressInfo}>
                <Text style={styles.progressStatus}>{status}</Text>
                <TouchableOpacity onPress={handleCancel}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {error && (
            <View style={styles.errorSection}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {!pulling && (
            <View style={styles.suggestions}>
              <Text style={styles.suggestionsLabel}>POPULAR</Text>
              {[
                'llama3.2',
                'mistral',
                'phi4',
                'gemma2',
                'deepseek-r1',
                'qwen2.5',
              ].map((name) => (
                <TouchableOpacity
                  key={name}
                  style={styles.suggestionRow}
                  onPress={() => setSearchText(name)}
                >
                  <Text style={styles.suggestionName}>{name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scrimTouch: { flex: 1 },
  sheet: {
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '65%',
  },
  handle: { alignItems: 'center', paddingTop: 10, paddingBottom: 6 },
  handleBar: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#3a3a3c' },
  sheetNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(84,84,88,0.65)',
  },
  sheetTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  sheetDone: { color: '#0a84ff', fontSize: 17 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#fff',
  },
  pullBtn: {
    backgroundColor: '#30d158',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  pullBtnText: { color: '#000', fontSize: 15, fontWeight: '600' },
  progressSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  pullingName: { color: '#fff', fontSize: 17, fontWeight: '600', marginBottom: 10 },
  progressBar: {
    flexDirection: 'row',
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2c2c2e',
    overflow: 'hidden',
  },
  progressFill: { backgroundColor: '#30d158', borderRadius: 2 },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  progressStatus: { color: 'rgba(235,235,245,0.5)', fontSize: 13 },
  cancelText: { color: '#ff453a', fontSize: 15 },
  errorSection: {
    marginHorizontal: 20,
    padding: 12,
    backgroundColor: 'rgba(255,69,58,0.1)',
    borderRadius: 10,
  },
  errorText: { color: '#ff453a', fontSize: 14 },
  suggestions: { paddingHorizontal: 16, paddingTop: 8 },
  suggestionsLabel: {
    fontSize: 11,
    color: 'rgba(235,235,245,0.3)',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  suggestionRow: {
    backgroundColor: '#1c1c1e',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
  },
  suggestionName: { color: 'rgba(235,235,245,0.8)', fontSize: 15 },
});