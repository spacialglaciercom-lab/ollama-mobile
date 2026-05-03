import { MMKV } from 'react-native-mmkv';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { ServerType } from '../api/types';

const storage = new MMKV();

export interface Server {
  id: string;
  name: string;
  url: string;
  apiKey?: string;
  isCloud: boolean;
  type: ServerType;
}

const OLLAMA_CLOUD_DEFAULT: Server = {
  id: 'ollama-cloud',
  name: 'Ollama Cloud',
  url: 'https://ollama.com',
  apiKey: undefined,
  isCloud: true,
  type: 'ollama',
};

interface ServerStore {
  servers: Server[];
  activeServerId: string | null;
  addServer: (server: Omit<Server, 'id'>) => void;
  updateServer: (id: string, updates: Partial<Omit<Server, 'id'>>) => void;
  removeServer: (id: string) => void;
  setActive: (id: string) => void;
  getActiveServer: () => Server | undefined;
}

export const useServerStore = create<ServerStore>()(
  persist(
    (set, get) => ({
      servers: [OLLAMA_CLOUD_DEFAULT],
      activeServerId: OLLAMA_CLOUD_DEFAULT.id,

      addServer: (s) =>
        set((state) => ({
          servers: [...state.servers, { ...s, id: `server-${Date.now()}` }],
        })),

      updateServer: (id, updates) =>
        set((state) => ({
          servers: state.servers.map((s) => (s.id === id ? { ...s, ...updates } : s)),
        })),

      removeServer: (id) =>
        set((state) => {
          const newServers = state.servers.filter((s) => s.id !== id);
          const newActiveId =
            state.activeServerId === id ? (newServers[0]?.id ?? null) : state.activeServerId;
          return { servers: newServers, activeServerId: newActiveId };
        }),

      setActive: (id) => set({ activeServerId: id }),

      getActiveServer: () => {
        const { servers, activeServerId } = get();
        return servers.find((s) => s.id === activeServerId);
      },
    }),
    {
      name: 'ollama-servers',
      storage: createJSONStorage(() => ({
        getItem: (key) => {
          const val = storage.getString(key);
          return val ?? null;
        },
        setItem: (key, val) => storage.set(key, JSON.stringify(val)),
        removeItem: (key) => storage.delete(key),
      })),
    }
  )
);
