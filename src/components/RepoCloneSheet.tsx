import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRepoStore } from '../store/useRepoStore';
import { cloneRepo, CloneProgress } from '../api/gitClient';

interface RepoCloneSheetProps {
  visible: boolean;
  onClose: () => void;
  onCloned: (repoId: string) => void;
}

export function RepoCloneSheet({ visible, onClose, onCloned }: RepoCloneSheetProps) {
  const { pat, addRepo } = useRepoStore();
  const [url, setUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [patInput, setPatInput] = useState('');
  const [cloning, setCloning] = useState(false);
  const [progress, setProgress] = useState<CloneProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClone = async () => {
    if (!url.trim()) return;

    setCloning(true);
    setError(null);
    setProgress(null);

    // Extract repo name from URL
    const trimmed = url.trim().replace(/\.git$/, '');
    const parts = trimmed.split('/');
    const repoName = parts[parts.length - 1] || 'repo';
    const repoId = `repo-${Date.now()}`;
    const authPat = patInput.trim() || pat || undefined;

    try {
      await cloneRepo(
        trimmed,
        repoId,
        branch.trim() || 'main',
        authPat,
        (p) => setProgress(p),
      );

      await addRepo({
        id: repoId,
        name: repoName,
        url: trimmed,
        branch: branch.trim() || 'main',
        lastSynced: Date.now(),
        createdAt: Date.now(),
      });

      // Reset form
      setUrl('');
      setBranch('main');
      setPatInput('');
      setProgress(null);
      onCloned(repoId);
    } catch (err: any) {
      setError(err?.message || 'Clone failed');
    } finally {
      setCloning(false);
    }
  };

  const progressPercent =
    progress && progress.total > 0
      ? Math.round((progress.loaded / progress.total) * 100)
      : 0;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.scrim}>
        <TouchableOpacity style={styles.scrimTouch} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle}>
            <View style={styles.handleBar} />
          </View>
          <View style={styles.sheetNav}>
            <Text style={styles.sheetTitle}>Clone Repository</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.sheetDone}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <View style={styles.formSection}>
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>REPOSITORY URL</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={url}
                  onChangeText={setUrl}
                  placeholder="https://github.com/user/repo"
                  placeholderTextColor="rgba(235,235,245,0.18)"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  editable={!cloning}
                />
              </View>
              <View style={styles.formSep} />
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>BRANCH</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={branch}
                  onChangeText={setBranch}
                  placeholder="main"
                  placeholderTextColor="rgba(235,235,245,0.18)"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!cloning}
                />
              </View>
              <View style={styles.formSep} />
              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>
                  PERSONAL ACCESS TOKEN <Text style={styles.fieldLabelOpt}>optional</Text>
                </Text>
                <TextInput
                  style={styles.fieldInput}
                  value={patInput}
                  onChangeText={setPatInput}
                  placeholder={pat ? 'Using saved PAT' : 'ghp_xxxx'}
                  placeholderTextColor="rgba(235,235,245,0.18)"
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                  editable={!cloning}
                />
              </View>
            </View>

            {cloning && (
              <View style={styles.progressSection}>
                <ActivityIndicator color="#30d158" size="small" />
                <Text style={styles.progressText}>
                  {progress ? `${progress.phase} ${progressPercent}%` : 'Starting clone...'}
                </Text>
              </View>
            )}

            {error && (
              <View style={styles.errorSection}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.cloneBtn, cloning && styles.cloneBtnDisabled]}
              onPress={handleClone}
              disabled={cloning || !url.trim()}
            >
              <Text style={styles.cloneBtnText}>
                {cloning ? 'Cloning...' : 'Clone'}
              </Text>
            </TouchableOpacity>
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
    maxHeight: '70%',
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
  form: { padding: 20 },
  formSection: {
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    overflow: 'hidden',
  },
  formGroup: { padding: 14 },
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
  formSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(84,84,88,0.65)',
    marginHorizontal: 14,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  progressText: {
    color: 'rgba(235,235,245,0.6)',
    fontSize: 14,
  },
  errorSection: {
    marginTop: 12,
    backgroundColor: 'rgba(255,69,58,0.12)',
    borderRadius: 8,
    padding: 10,
  },
  errorText: {
    color: '#ff453a',
    fontSize: 14,
  },
  cloneBtn: {
    backgroundColor: '#30d158',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  cloneBtnDisabled: {
    opacity: 0.5,
  },
  cloneBtnText: { color: '#000', fontSize: 17, fontWeight: '600' },
});