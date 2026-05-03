import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  FlatList,
  StyleSheet,
} from 'react-native';

import { commitChanges, pushRepo, pullRepo, GitStatusResult } from '../api/gitClient';
import { useRepoStore } from '../store/useRepoStore';

interface CommitSheetProps {
  visible: boolean;
  onClose: () => void;
  repoId: string;
  branch: string;
  status: GitStatusResult | null;
  onDone: () => void;
}

export function CommitSheet({
  visible,
  onClose,
  repoId,
  branch,
  status,
  onDone,
}: CommitSheetProps) {
  const { pat, authorName, authorEmail, markSynced } = useRepoStore();
  const [message, setMessage] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirtyCount = status
    ? status.modified.length + status.added.length + status.deleted.length + status.untracked.length
    : 0;

  const handleCommit = async () => {
    if (!message.trim()) return;
    setWorking(true);
    setError(null);

    try {
      await commitChanges(repoId, message.trim(), {
        name: authorName || 'User',
        email: authorEmail || 'user@example.com',
      });
      setMessage('');
      markSynced(repoId);
      onDone();
    } catch (err: any) {
      setError(err?.message || 'Commit failed');
    } finally {
      setWorking(false);
    }
  };

  const handlePush = async () => {
    setWorking(true);
    setError(null);

    try {
      await pushRepo(repoId, branch, pat || undefined);
      markSynced(repoId);
      onDone();
    } catch (err: any) {
      setError(err?.message || 'Push failed');
    } finally {
      setWorking(false);
    }
  };

  const handlePull = async () => {
    setWorking(true);
    setError(null);

    try {
      await pullRepo(repoId, branch, pat || undefined);
      markSynced(repoId);
      onDone();
    } catch (err: any) {
      setError(err?.message || 'Pull failed');
    } finally {
      setWorking(false);
    }
  };

  const renderChangedFile = ({ item }: { item: string }) => (
    <View style={styles.changedRow}>
      <Text style={styles.changedIcon}>M</Text>
      <Text style={styles.changedPath} numberOfLines={1}>
        {item}
      </Text>
    </View>
  );

  const allChanged = status
    ? [...status.modified, ...status.added, ...status.deleted, ...status.untracked]
    : [];

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.scrim}>
        <TouchableOpacity style={styles.scrimTouch} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle}>
            <View style={styles.handleBar} />
          </View>
          <View style={styles.sheetNav}>
            <Text style={styles.sheetTitle}>Git</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.sheetDone}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {/* Changed files */}
            {allChanged.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>CHANGES ({allChanged.length})</Text>
                <FlatList
                  data={allChanged}
                  keyExtractor={(item) => item}
                  renderItem={renderChangedFile}
                  style={styles.changedList}
                  scrollEnabled={allChanged.length > 5}
                />
              </View>
            )}

            {/* Commit form */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>COMMIT</Text>
              <TextInput
                style={styles.commitInput}
                value={message}
                onChangeText={setMessage}
                placeholder="Commit message"
                placeholderTextColor="rgba(235,235,245,0.18)"
                multiline
                editable={!working}
              />
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  styles.commitBtn,
                  (!message.trim() || working) && styles.actionBtnDisabled,
                ]}
                onPress={handleCommit}
                disabled={!message.trim() || working}
              >
                {working ? <ActivityIndicator color="#000" size="small" /> : null}
                <Text style={styles.actionBtnText}>Commit</Text>
              </TouchableOpacity>
            </View>

            {/* Push / Pull */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>REMOTE</Text>
              <View style={styles.remoteRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.pushBtn, working && styles.actionBtnDisabled]}
                  onPress={handlePush}
                  disabled={working}
                >
                  <Text style={styles.actionBtnText}>Push</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.pullBtn, working && styles.actionBtnDisabled]}
                  onPress={handlePull}
                  disabled={working}
                >
                  <Text style={styles.actionBtnText}>Pull</Text>
                </TouchableOpacity>
              </View>
            </View>

            {error && (
              <View style={styles.errorSection}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </View>
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
    maxHeight: '80%',
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
  content: { padding: 20 },
  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 11,
    color: 'rgba(235,235,245,0.3)',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  changedList: {
    maxHeight: 120,
    backgroundColor: '#2c2c2e',
    borderRadius: 8,
    overflow: 'hidden',
  },
  changedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  changedIcon: {
    color: '#ff9f0a',
    fontSize: 12,
    fontWeight: '700',
    width: 16,
  },
  changedPath: {
    color: 'rgba(235,235,245,0.7)',
    fontSize: 13,
    flex: 1,
  },
  commitInput: {
    backgroundColor: '#2c2c2e',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 15,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  actionBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  actionBtnDisabled: { opacity: 0.4 },
  actionBtnText: { color: '#000', fontSize: 15, fontWeight: '600' },
  commitBtn: { backgroundColor: '#30d158' },
  pushBtn: { backgroundColor: '#0a84ff', flex: 1 },
  pullBtn: { backgroundColor: '#bf5af2', flex: 1 },
  remoteRow: { flexDirection: 'row', gap: 8 },
  errorSection: {
    backgroundColor: 'rgba(255,69,58,0.12)',
    borderRadius: 8,
    padding: 10,
  },
  errorText: { color: '#ff453a', fontSize: 14 },
});
