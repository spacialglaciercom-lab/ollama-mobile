import { useLocalSearchParams, router } from 'expo-router';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

import {
  listDir,
  getStatus,
  getCurrentBranch,
  FileEntry,
  GitStatusResult,
} from '../../src/api/gitClient';
import { CommitSheet } from '../../src/components/CommitSheet';
import { GitStatusChip } from '../../src/components/GitStatusChip';
import { useRepoStore } from '../../src/store/useRepoStore';

export default function RepoBrowserScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repos } = useRepoStore();
  const repo = repos.find((r) => r.id === id);

  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState('');
  const [pathStack, setPathStack] = useState<string[]>([]);
  const [branch, setBranch] = useState<string>('');
  const [gitStatus, setGitStatus] = useState<GitStatusResult | null>(null);
  const [commitVisible, setCommitVisible] = useState(false);

  const loadDir = useCallback(
    async (subPath: string) => {
      if (!id) return;
      setLoading(true);
      try {
        const items = await listDir(id, subPath);
        setEntries(items);
        setCurrentPath(subPath);
      } catch (err: any) {
        setEntries([]);
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  const loadStatus = useCallback(async () => {
    if (!id) return;
    try {
      const [s, b] = await Promise.all([getStatus(id), getCurrentBranch(id)]);
      setGitStatus(s);
      if (b) setBranch(b);
    } catch {}
  }, [id]);

  useEffect(() => {
    loadDir('');
    loadStatus();
  }, [id]);

  const handleOpenEntry = (entry: FileEntry) => {
    if (entry.isDirectory) {
      setPathStack((prev) => [...prev, currentPath]);
      loadDir(entry.path);
    } else {
      router.push({
        pathname: `/repos/${id}/file`,
        params: { path: entry.path },
      });
    }
  };

  const handleGoBack = () => {
    if (pathStack.length === 0) {
      router.back();
      return;
    }
    const prevPath = pathStack[pathStack.length - 1];
    setPathStack((prev) => prev.slice(0, -1));
    loadDir(prevPath);
  };

  const getFileIcon = (entry: FileEntry) => {
    if (entry.isDirectory) return 'D';
    const ext = entry.name.split('.').pop()?.toLowerCase() ?? '';
    const iconMap: Record<string, string> = {
      ts: 'TS',
      tsx: 'TX',
      js: 'JS',
      jsx: 'JX',
      py: 'PY',
      rs: 'RS',
      go: 'GO',
      rb: 'RB',
      java: 'JV',
      json: '{}',
      md: 'MD',
      css: 'CS',
      html: 'HT',
      yaml: 'YL',
      yml: 'YL',
      toml: 'TM',
      txt: 'TX',
      sh: 'SH',
      sql: 'SQ',
      graphql: 'GQ',
    };
    return iconMap[ext] || 'F';
  };

  const renderEntry = ({ item }: { item: FileEntry }) => (
    <TouchableOpacity
      style={styles.fileRow}
      onPress={() => handleOpenEntry(item)}
      activeOpacity={0.6}
    >
      <View style={[styles.fileIcon, item.isDirectory && styles.dirIcon]}>
        <Text style={[styles.fileIconText, item.isDirectory && styles.dirIconText]}>
          {getFileIcon(item)}
        </Text>
      </View>
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.filePath} numberOfLines={1}>
          {item.path}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={handleGoBack}>
          <Text style={styles.backBtnText}>&lt; Back</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          {repo?.name || 'Repo'}
        </Text>
        <TouchableOpacity style={styles.gitBtn} onPress={() => setCommitVisible(true)}>
          <Text style={styles.gitBtnText}>Git</Text>
        </TouchableOpacity>
      </View>

      {/* Breadcrumb + branch */}
      <View style={styles.infoBar}>
        <Text style={styles.branchLabel}>{branch || repo?.branch || 'main'}</Text>
        {currentPath ? (
          <Text style={styles.breadcrumb} numberOfLines={1}>
            /{currentPath}
          </Text>
        ) : null}
        <View style={styles.statusChips}>
          <GitStatusChip status={gitStatus} />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#30d158" size="large" />
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.path}
          renderItem={renderEntry}
          contentContainerStyle={entries.length === 0 ? styles.emptyList : styles.list}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Empty directory</Text>
            </View>
          }
        />
      )}

      <CommitSheet
        visible={commitVisible}
        onClose={() => setCommitVisible(false)}
        repoId={id}
        branch={branch || repo?.branch || 'main'}
        status={gitStatus}
        onDone={loadStatus}
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
  backBtn: { padding: 4 },
  backBtnText: { color: '#0a84ff', fontSize: 17 },
  navTitle: { color: '#fff', fontSize: 20, fontWeight: '700', flex: 1, textAlign: 'center' },
  gitBtn: {
    backgroundColor: '#2c2c2e',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  gitBtnText: { color: 'rgba(235,235,245,0.8)', fontSize: 14, fontWeight: '600' },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  branchLabel: {
    color: '#0a84ff',
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'rgba(10,132,255,0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  breadcrumb: {
    color: 'rgba(235,235,245,0.3)',
    fontSize: 13,
    flex: 1,
  },
  statusChips: { marginLeft: 'auto' },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  emptyState: { alignItems: 'center' },
  emptyText: { color: 'rgba(235,235,245,0.3)', fontSize: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(84,84,88,0.3)',
  },
  fileIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#2c2c2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dirIcon: {
    backgroundColor: 'rgba(10,132,255,0.15)',
  },
  fileIconText: {
    color: 'rgba(235,235,245,0.5)',
    fontSize: 10,
    fontWeight: '700',
  },
  dirIconText: {
    color: '#0a84ff',
  },
  fileInfo: { flex: 1 },
  fileName: { color: '#fff', fontSize: 16 },
  filePath: { color: 'rgba(235,235,245,0.3)', fontSize: 12, marginTop: 1 },
});
