import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { useRepoStore } from '../../src/store/useRepoStore';
import { deleteRepo, getStatus, GitStatusResult } from '../../src/api/gitClient';
import { RepoCloneSheet } from '../../src/components/RepoCloneSheet';
import { GitStatusChip } from '../../src/components/GitStatusChip';

export default function ReposScreen() {
  const { repos, loadRepos, removeRepo, pat, loadPat, loadAuthor } = useRepoStore();
  const [cloneVisible, setCloneVisible] = useState(false);
  const [statusMap, setStatusMap] = useState<Record<string, GitStatusResult>>({});

  useEffect(() => {
    loadRepos();
    loadPat();
    loadAuthor();
  }, []);

  // Load git status for each repo
  useEffect(() => {
    repos.forEach(async (repo) => {
      try {
        const s = await getStatus(repo.id);
        setStatusMap((prev) => ({ ...prev, [repo.id]: s }));
      } catch {
        // Repo may not be cloned yet
      }
    });
  }, [repos]);

  const handleOpenRepo = (id: string) => {
    router.push(`/repos/${id}`);
  };

  const handleDeleteRepo = (id: string) => {
    Alert.alert('Delete Repository', 'Remove this repo from the app? This deletes the local clone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteRepo(id);
          await removeRepo(id);
          setStatusMap((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
          });
        },
      },
    ]);
  };

  const handleCloned = (repoId: string) => {
    setCloneVisible(false);
    loadRepos();
  };

  const formatTime = (ts: number | null) => {
    if (!ts) return 'Never';
    const d = new Date(ts);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderRepo = ({ item }: { item: (typeof repos)[0] }) => (
    <TouchableOpacity
      style={styles.repoCard}
      onPress={() => handleOpenRepo(item.id)}
      onLongPress={() => handleDeleteRepo(item.id)}
      activeOpacity={0.6}
    >
      <View style={styles.repoCardContent}>
        <Text style={styles.repoName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.repoUrl} numberOfLines={1}>{item.url}</Text>
        <View style={styles.repoMeta}>
          <Text style={styles.repoBranch}>{item.branch}</Text>
          <GitStatusChip status={statusMap[item.id] ?? null} />
        </View>
      </View>
      <Text style={styles.repoTime}>{formatTime(item.lastSynced)}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.navBar}>
        <Text style={styles.navTitle}>Repos</Text>
        <TouchableOpacity style={styles.cloneBtn} onPress={() => setCloneVisible(true)}>
          <Text style={styles.cloneBtnIcon}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={repos}
        keyExtractor={(item) => item.id}
        renderItem={renderRepo}
        contentContainerStyle={repos.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No repositories</Text>
            <Text style={styles.emptySub}>Tap + to clone a repo</Text>
          </View>
        }
      />

      <RepoCloneSheet
        visible={cloneVisible}
        onClose={() => setCloneVisible(false)}
        onCloned={handleCloned}
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
  navTitle: { color: '#fff', fontSize: 34, fontWeight: '700' },
  cloneBtn: { padding: 8 },
  cloneBtnIcon: { fontSize: 24, color: '#30d158', fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingTop: 8 },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  emptyState: { alignItems: 'center' },
  emptyTitle: { color: 'rgba(235,235,245,0.3)', fontSize: 20, fontWeight: '600' },
  emptySub: { color: 'rgba(235,235,245,0.18)', fontSize: 15, marginTop: 4 },
  repoCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  repoCardContent: { flex: 1 },
  repoName: { color: '#fff', fontSize: 17, fontWeight: '500' },
  repoUrl: { color: 'rgba(235,235,245,0.3)', fontSize: 13, marginTop: 2 },
  repoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  repoBranch: {
    color: '#0a84ff',
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'rgba(10,132,255,0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  repoTime: { color: 'rgba(235,235,245,0.3)', fontSize: 15, marginLeft: 12 },
});