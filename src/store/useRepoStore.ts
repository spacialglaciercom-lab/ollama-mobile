import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { getRepos, insertRepo, deleteRepoRecord, updateRepoSynced, RepoRecord } from '../db/schema';

const PAT_KEY = 'github-pat';
const AUTHOR_NAME_KEY = 'git-author-name';
const AUTHOR_EMAIL_KEY = 'git-author-email';

interface RepoStore {
  repos: RepoRecord[];
  pat: string | null;
  authorName: string;
  authorEmail: string;
  loadRepos: () => Promise<void>;
  addRepo: (repo: RepoRecord) => Promise<void>;
  removeRepo: (id: string) => Promise<void>;
  markSynced: (id: string) => Promise<void>;
  setPat: (pat: string) => void;
  loadPat: () => Promise<void>;
  setAuthor: (name: string, email: string) => void;
  loadAuthor: () => Promise<void>;
}

export const useRepoStore = create<RepoStore>()((set, get) => ({
  repos: [],
  pat: null,
  authorName: '',
  authorEmail: '',

  loadRepos: async () => {
    const repos = await getRepos();
    set({ repos });
  },

  addRepo: async (repo) => {
    await insertRepo(repo);
    set((state) => ({ repos: [repo, ...state.repos] }));
  },

  removeRepo: async (id) => {
    await deleteRepoRecord(id);
    set((state) => ({ repos: state.repos.filter((r) => r.id !== id) }));
  },

  markSynced: async (id) => {
    const now = Date.now();
    await updateRepoSynced(id, now);
    set((state) => ({
      repos: state.repos.map((r) => (r.id === id ? { ...r, lastSynced: now } : r)),
    }));
  },

  setPat: (pat) => {
    set({ pat });
    SecureStore.setItemAsync(PAT_KEY, pat);
  },

  loadPat: async () => {
    const pat = await SecureStore.getItemAsync(PAT_KEY);
    set({ pat });
  },

  setAuthor: (name, email) => {
    set({ authorName: name, authorEmail: email });
    SecureStore.setItemAsync(AUTHOR_NAME_KEY, name);
    SecureStore.setItemAsync(AUTHOR_EMAIL_KEY, email);
  },

  loadAuthor: async () => {
    const name = (await SecureStore.getItemAsync(AUTHOR_NAME_KEY)) ?? '';
    const email = (await SecureStore.getItemAsync(AUTHOR_EMAIL_KEY)) ?? '';
    set({ authorName: name, authorEmail: email });
  },
}));
