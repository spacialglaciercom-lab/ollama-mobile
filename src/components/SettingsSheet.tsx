import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Switch,
  Alert,
} from 'react-native';

import { pingServer } from '../api/ollamaClient';
import { ServerType } from '../api/types';
import { pingZeroClaw } from '../api/zeroclawClient';
import { useChatStore } from '../store/useChatStore';
import { useServerStore, Server, buildServerUrl } from '../store/useServerStore';

interface SettingsSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function SettingsSheet({ visible, onClose }: SettingsSheetProps) {
  const { servers, activeServerId, addServer, updateServer, removeServer, setActive } =
    useServerStore();
  const {
    autoSaveEnabled,
    setAutoSave,
    autoDeleteDays,
    setAutoDeleteDays,
    cleanupOldConversations,
  } = useChatStore();

  const [showForm, setShowForm] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [name, setName] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [tls, setTls] = useState(false);
  const [pathPrefix, setPathPrefix] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [type, setType] = useState<ServerType>('ollama');
  const [enabled, setEnabled] = useState(true);
  const [pinging, setPinging] = useState<string | null>(null);
  const [pingResult, setPingResult] = useState<{ id: string; ok: boolean } | null>(null);
  const [autoDeleteInput, setAutoDeleteInput] = useState(String(autoDeleteDays));

  const openAdd = () => {
    setEditingServer(null);
    setName('');
    setHost('');
    setPort('11434');
    setTls(false);
    setPathPrefix('');
    setApiKey('');
    setType('ollama');
    setEnabled(true);
    setShowForm(true);
  };

  const openEdit = (server: Server) => {
    setEditingServer(server);
    setName(server.name);
    setHost(server.host);
    setPort(String(server.port));
    setTls(server.tls);
    setPathPrefix(server.pathPrefix ?? '');
    setApiKey(server.apiKey ?? '');
    setType(server.type);
    setEnabled(server.enabled);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!name.trim() || !host.trim()) return;
    const portNum = parseInt(port.trim(), 10) || (tls ? 443 : 80);
    const prefix = pathPrefix.trim() || undefined;
    const payload: Omit<Server, 'id'> = {
      name: name.trim(),
      host: host.trim(),
      port: portNum,
      tls,
      pathPrefix: prefix,
      apiKey: apiKey.trim() || undefined,
      enabled,
      isCloud: host.trim().includes('ollama.com'),
      type,
    };
    if (editingServer) {
      updateServer(editingServer.id, payload);
    } else {
      addServer(payload);
    }
    setShowForm(false);
  };

  const handlePing = async (server: Server) => {
    setPinging(server.id);
    setPingResult(null);
    let ok = false;
    const url = buildServerUrl(server);
    if (server.type === 'zeroclaw') {
      ok = await pingZeroClaw(url, server.apiKey);
    } else {
      ok = await pingServer(url, server.apiKey);
    }
    setPinging(null);
    setPingResult({ id: server.id, ok });
  };

  const handleDelete = (server: Server) => {
    if (server.id === 'ollama-cloud') return;
    removeServer(server.id);
  };

  const renderServer = ({ item }: { item: Server }) => (
    <TouchableOpacity
      style={[
        styles.serverRow,
        item.id === activeServerId && styles.serverRowActive,
        !item.enabled && styles.serverRowDisabled,
      ]}
      onPress={() => setActive(item.id)}
      onLongPress={() => openEdit(item)}
      activeOpacity={0.6}
    >
      <View style={styles.serverDotContainer}>
        <View
          style={[
            styles.serverDot,
            {
              backgroundColor:
                pingResult?.id === item.id ? (pingResult.ok ? '#30d158' : '#ff453a') : '#30d158',
              opacity: item.enabled ? 1 : 0.4,
            },
          ]}
        />
      </View>
      <View style={styles.serverInfo}>
        <View style={styles.serverNameRow}>
          <Text style={[styles.serverName, !item.enabled && styles.textDisabled]}>{item.name}</Text>
          {item.isCloud && <Text style={styles.cloudBadge}>Cloud</Text>}
          <Text style={styles.typeBadge}>{item.type === 'zeroclaw' ? 'ZeroClaw' : 'Ollama'}</Text>
          {!item.enabled && <Text style={styles.disabledBadge}>Off</Text>}
        </View>
        <Text style={styles.serverUrl} numberOfLines={1}>
          {buildServerUrl(item)}
        </Text>
      </View>
      <TouchableOpacity style={styles.pingBtn} onPress={() => handlePing(item)}>
        <Text style={styles.pingText}>{pinging === item.id ? '...' : 'Ping'}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.scrim}>
        <TouchableOpacity style={styles.scrimTouch} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle}>
            <View style={styles.handleBar} />
          </View>
          <View style={styles.sheetNav}>
            <Text style={styles.sheetTitle}>Settings</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.sheetDone}>Done</Text>
            </TouchableOpacity>
          </View>

          {!showForm ? (
            <>
              <View style={styles.sectionLabelWrap}>
                <Text style={styles.sectionLabel}>SERVERS</Text>
              </View>

              <FlatList
                data={servers}
                keyExtractor={(item) => item.id}
                renderItem={renderServer}
                contentContainerStyle={styles.serverList}
              />

              <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
                <Text style={styles.addBtnText}>+ Add Server</Text>
              </TouchableOpacity>

              {/* Conversation Settings Section */}
              <View style={styles.sectionLabelWrap}>
                <Text style={styles.sectionLabel}>CONVERSATIONS</Text>
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingLabel}>
                  <Text style={styles.settingLabelText}>Auto-Save Conversations</Text>
                  <Text style={styles.settingSubtext}>Automatically save chat history</Text>
                </View>
                <Switch
                  value={autoSaveEnabled}
                  onValueChange={setAutoSave}
                  trackColor={{ false: '#3a3a3c', true: '#30d158' }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.settingRow}>
                <View style={styles.settingLabel}>
                  <Text style={styles.settingLabelText}>Auto-Delete After</Text>
                  <Text style={styles.settingSubtext}>0 = never delete</Text>
                </View>
                <View style={styles.autoDeleteControl}>
                  <TextInput
                    style={styles.autoDeleteInput}
                    value={autoDeleteInput}
                    onChangeText={setAutoDeleteInput}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor="rgba(235,235,245,0.3)"
                    onBlur={() => {
                      const days = parseInt(autoDeleteInput, 10);
                      if (!isNaN(days) && days >= 0) {
                        setAutoDeleteDays(days);
                      } else {
                        setAutoDeleteInput('0');
                        setAutoDeleteDays(0);
                      }
                    }}
                  />
                  <Text style={styles.autoDeleteUnit}>days</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.cleanupBtn}
                onPress={() => {
                  cleanupOldConversations();
                  Alert.alert('Cleanup', 'Old conversations will be removed in background');
                }}
              >
                <Text style={styles.cleanupBtnText}>Clean Up Now</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.form}>
              <Text style={styles.formTitle}>{editingServer ? 'Edit Server' : 'Add Server'}</Text>

              <View style={styles.formSection}>
                <View style={styles.formGroup}>
                  <View style={styles.toggleRow}>
                    <Text style={styles.fieldLabel}>ENABLED</Text>
                    <Switch
                      value={enabled}
                      onValueChange={setEnabled}
                      trackColor={{ false: '#3a3a3c', true: 'rgba(48,209,88,0.3)' }}
                      thumbColor={enabled ? '#30d158' : '#8e8e93'}
                    />
                  </View>
                </View>
                <View style={styles.formSep} />
                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>NAME</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={name}
                    onChangeText={setName}
                    placeholder="My Server"
                    placeholderTextColor="rgba(235,235,245,0.18)"
                  />
                </View>
                <View style={styles.formSep} />
                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>TYPE</Text>
                  <View style={styles.typeToggle}>
                    <TouchableOpacity
                      style={[styles.typeOption, type === 'ollama' && styles.typeOptionActive]}
                      onPress={() => setType('ollama')}
                    >
                      <Text
                        style={[
                          styles.typeOptionText,
                          type === 'ollama' && styles.typeOptionTextActive,
                        ]}
                      >
                        Ollama
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.typeOption, type === 'zeroclaw' && styles.typeOptionActive]}
                      onPress={() => setType('zeroclaw')}
                    >
                      <Text
                        style={[
                          styles.typeOptionText,
                          type === 'zeroclaw' && styles.typeOptionTextActive,
                        ]}
                      >
                        ZeroClaw
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.formSep} />
                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>HOST</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={host}
                    onChangeText={setHost}
                    placeholder="192.168.1.x"
                    placeholderTextColor="rgba(235,235,245,0.18)"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                  />
                </View>
                <View style={styles.formSep} />
                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>PORT</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={port}
                    onChangeText={setPort}
                    placeholder={type === 'zeroclaw' ? '8080' : '11434'}
                    placeholderTextColor="rgba(235,235,245,0.18)"
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.formSep} />
                <View style={styles.formGroup}>
                  <View style={styles.toggleRow}>
                    <Text style={styles.fieldLabel}>TLS / SSL</Text>
                    <Switch
                      value={tls}
                      onValueChange={setTls}
                      trackColor={{ false: '#3a3a3c', true: 'rgba(48,209,88,0.3)' }}
                      thumbColor={tls ? '#30d158' : '#8e8e93'}
                    />
                  </View>
                </View>
                <View style={styles.formSep} />
                <View style={styles.formGroup}>
                  <Text style={styles.fieldLabel}>PATH PREFIX</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={pathPrefix}
                    onChangeText={setPathPrefix}
                    placeholder="api/v1"
                    placeholderTextColor="rgba(235,235,245,0.18)"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <View style={styles.formSep} />
                <View style={styles.formGroup}>
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

              <TouchableOpacity style={styles.connectBtn} onPress={handleSave}>
                <Text style={styles.connectBtnText}>{editingServer ? 'Save' : 'Add Server'}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setShowForm(false)}>
                <Text style={styles.cancelLink}>Cancel</Text>
              </TouchableOpacity>

              {editingServer && editingServer.id !== 'ollama-cloud' && (
                <TouchableOpacity
                  onPress={() => {
                    handleDelete(editingServer);
                    setShowForm(false);
                  }}
                >
                  <Text style={[styles.cancelLink, { color: '#ff453a', marginTop: 24 }]}>
                    Delete Server
                  </Text>
                </TouchableOpacity>
              )}
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
    maxHeight: '82%',
  },
  handle: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3a3a3c',
  },
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
  sectionLabelWrap: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 6 },
  sectionLabel: {
    fontSize: 11,
    color: 'rgba(235,235,245,0.3)',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  serverList: { paddingHorizontal: 16, paddingBottom: 12 },
  serverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  serverRowActive: {
    borderWidth: 1,
    borderColor: '#30d158',
  },
  serverRowDisabled: {
    opacity: 0.5,
  },
  serverDotContainer: { width: 20, alignItems: 'center' },
  serverDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#30d158',
  },
  serverInfo: { flex: 1 },
  serverNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  serverName: { color: '#fff', fontSize: 17 },
  textDisabled: { color: 'rgba(235,235,245,0.3)' },
  cloudBadge: {
    color: '#30d158',
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: 'rgba(48,209,88,0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadge: {
    color: '#0a84ff',
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: 'rgba(10,132,255,0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  disabledBadge: {
    color: '#ff453a',
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: 'rgba(255,69,58,0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  serverUrl: { color: 'rgba(235,235,245,0.3)', fontSize: 13, marginTop: 2 },
  pingBtn: {
    backgroundColor: '#2c2c2e',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pingText: { color: 'rgba(235,235,245,0.8)', fontSize: 13 },
  addBtn: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#30d158',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addBtnText: { color: '#000', fontSize: 17, fontWeight: '600' },
  form: { padding: 20 },
  formTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 20 },
  formSection: {
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    overflow: 'hidden',
  },
  formGroup: { padding: 14 },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 11,
    color: 'rgba(235,235,245,0.3)',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  fieldLabelOpt: { textTransform: 'none', color: 'rgba(235,235,245,0.18)' },
  fieldInput: {
    fontSize: 17,
    color: '#fff',
    padding: 0,
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: '#2c2c2e',
    borderRadius: 8,
    padding: 2,
    marginTop: 4,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  typeOptionActive: {
    backgroundColor: '#3a3a3c',
  },
  typeOptionText: {
    color: 'rgba(235,235,245,0.3)',
    fontSize: 15,
    fontWeight: '500',
  },
  typeOptionTextActive: {
    color: '#fff',
  },
  formSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(84,84,88,0.65)',
    marginHorizontal: 14,
  },
  connectBtn: {
    backgroundColor: '#30d158',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  connectBtnText: { color: '#000', fontSize: 17, fontWeight: '600' },
  cancelLink: { color: '#0a84ff', fontSize: 17, textAlign: 'center', marginTop: 16 },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2c2c2e',
    borderRadius: 12,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  settingLabel: { flex: 1 },
  settingLabelText: { color: '#fff', fontSize: 17, fontWeight: '500' },
  settingSubtext: { color: 'rgba(235,235,245,0.3)', fontSize: 13, marginTop: 2 },
  autoDeleteControl: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  autoDeleteInput: {
    backgroundColor: '#1c1c1e',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 17,
    color: '#fff',
    width: 60,
    textAlign: 'center',
  },
  autoDeleteUnit: { color: 'rgba(235,235,245,0.3)', fontSize: 15 },
  cleanupBtn: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#2c2c2e',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cleanupBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
