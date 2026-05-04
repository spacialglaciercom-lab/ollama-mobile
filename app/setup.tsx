import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Animated } from 'react-native';

import { pingServer, fetchModels as apiFetchModels } from '../src/api/ollamaClient';
import { useModelStore } from '../src/store/useModelStore';
import { useServerStore, buildServerUrl, parseLegacyUrl } from '../src/store/useServerStore';

export default function SetupScreen() {
  const { servers, activeServerId, addServer, updateServer, setActive } = useServerStore();
  const { fetchModels } = useModelStore();

  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [modelCount, setModelCount] = useState(0);
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Pre-fill if Ollama Cloud server exists
  useEffect(() => {
    const cloud = servers.find((s) => s.isCloud);
    if (cloud) {
      setUrl(buildServerUrl(cloud));
      setApiKey(cloud.apiKey ?? '');
    }
  }, []);

  const handleConnect = async () => {
    if (!url.trim()) return;

    setStatus('checking');

    // Auto-detect if this is Ollama Cloud
    const isCloud = url.trim().includes('ollama.com');
    const key = apiKey.trim() || undefined;

    // Parse URL into new server fields
    const parsed = parseLegacyUrl(url.trim());
    const serverUrl = buildServerUrl({
      ...parsed,
      id: '',
      name: '',
      enabled: true,
      isCloud: false,
      type: 'ollama',
    });

    // Ping the server
    const ok = await pingServer(serverUrl, key);

    if (ok) {
      // Save or update server
      const existing = servers.find((s) => buildServerUrl(s) === serverUrl);
      if (existing) {
        if (key) updateServer(existing.id, { apiKey: key });
        setActive(existing.id);
      } else {
        addServer({
          name: isCloud ? 'Ollama Cloud' : 'My Server',
          host: parsed.host,
          port: parsed.port,
          tls: parsed.tls,
          pathPrefix: parsed.pathPrefix,
          apiKey: key,
          enabled: true,
          isCloud,
          type: 'ollama',
        });
      }

      // Try to fetch models
      try {
        const list = await apiFetchModels(serverUrl, key);
        setModelCount(list.models.length);
        setStatus('success');

        // Also update the model store
        const activeServer = useServerStore.getState().getActiveServer();
        if (activeServer) fetchModels();

        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }).start();
      } catch {
        setStatus('success');
        setModelCount(0);
      }
    } else {
      setStatus('error');
    }
  };

  // If already connected, skip to main
  if (activeServerId && servers.find((s) => s.id === activeServerId)) {
    // Don't auto-redirect — let user re-configure if they want
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.navBar}>
        <Text style={styles.navTitle}>Connect to Ollama</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SERVER</Text>
          <View style={styles.sectionInner}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>URL</Text>
              <TextInput
                style={styles.fieldInput}
                value={url}
                onChangeText={setUrl}
                placeholder="http://192.168.1.x:11434"
                placeholderTextColor="rgba(235,235,245,0.18)"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                autoFocus
              />
            </View>
            <View style={styles.fieldSep} />
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                API KEY <Text style={styles.fieldLabelOpt}>optional</Text>
              </Text>
              <TextInput
                style={styles.fieldInput}
                value={apiKey}
                onChangeText={setApiKey}
                placeholder="••••••••"
                placeholderTextColor="rgba(235,235,245,0.18)"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.connectBtn, status === 'checking' && styles.connectBtnDisabled]}
          onPress={handleConnect}
          disabled={status === 'checking'}
        >
          <Text style={styles.connectBtnText}>
            {status === 'checking' ? 'Connecting...' : 'Connect'}
          </Text>
        </TouchableOpacity>

        {status === 'success' && (
          <Animated.View style={[styles.statusLine, { opacity: opacityAnim }]}>
            <Text style={styles.statusIcon}>✓</Text>
            <Text style={styles.statusText}>
              Connected
              {modelCount > 0 ? ` — ${modelCount} model${modelCount !== 1 ? 's' : ''}` : ''}
            </Text>
          </Animated.View>
        )}

        {status === 'error' && (
          <View style={styles.statusLineError}>
            <Text style={styles.statusIconError}>✗</Text>
            <Text style={styles.statusTextError}>Unreachable</Text>
          </View>
        )}

        {status === 'checking' && (
          <View style={styles.statusLineChecking}>
            <Text style={styles.statusTextChecking}>Checking</Text>
            <Text style={styles.blink}>...</Text>
          </View>
        )}

        {status === 'success' && (
          <TouchableOpacity style={styles.startBtn} onPress={() => router.replace('/')}>
            <Text style={styles.startBtnText}>Start Chatting →</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  navBar: {
    paddingTop: 60,
    paddingBottom: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  navTitle: { color: '#fff', fontSize: 17, fontWeight: '600' },
  content: { flex: 1, paddingTop: 32 },
  section: { marginHorizontal: 16, marginBottom: 8 },
  sectionLabel: {
    fontSize: 11,
    color: 'rgba(235,235,245,0.3)',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
    paddingBottom: 6,
  },
  sectionInner: {
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    overflow: 'hidden',
  },
  fieldGroup: { padding: 14 },
  fieldLabel: {
    fontSize: 11,
    color: 'rgba(235,235,245,0.3)',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  fieldLabelOpt: {
    textTransform: 'none',
    color: 'rgba(235,235,245,0.18)',
  },
  fieldInput: {
    fontSize: 17,
    color: '#fff',
    padding: 0,
  },
  fieldSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(84,84,88,0.65)',
    marginLeft: 14,
  },
  connectBtn: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#30d158',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  connectBtnDisabled: { opacity: 0.6 },
  connectBtnText: { color: '#000', fontSize: 17, fontWeight: '600' },
  statusLine: {
    marginTop: 16,
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusIcon: { color: '#30d158', fontSize: 15 },
  statusText: { color: '#30d158', fontSize: 15 },
  statusLineError: {
    marginTop: 16,
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusIconError: { color: '#ff453a', fontSize: 15 },
  statusTextError: { color: '#ff453a', fontSize: 15 },
  statusLineChecking: {
    marginTop: 16,
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusTextChecking: { color: 'rgba(235,235,245,0.8)', fontSize: 15 },
  blink: { color: 'rgba(235,235,245,0.8)', fontSize: 15 },
  startBtn: {
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: '#0a84ff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  startBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
