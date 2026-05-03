import { MMKV } from 'react-native-mmkv';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { ServerType } from '../api/types';

const storage = new MMKV();

export interface Server {
  id: string;
  name: string;
  host: string;
  port: number;
  tls: boolean;
  pathPrefix?: string;
  apiKey?: string;
  enabled: boolean;
  isCloud: boolean;
  type: ServerType;
}

const OLLAMA_CLOUD_DEFAULT: Server = {
  id: 'ollama-cloud',
  name: 'Ollama Cloud',
  host: 'ollama.com',
  port: 443,
  tls: true,
  pathPrefix: undefined,
  apiKey: undefined,
  enabled: true,
  isCloud: true,
  type: 'ollama',
};

export function parseLegacyUrl(url: string): {
  host: string;
  port: number;
  tls: boolean;
  pathPrefix?: string;
} {
  try {
    const parsed = new URL(url);
    const tls = parsed.protocol === 'https:';
    const host = parsed.hostname;
    const port = parsed.port ? parseInt(parsed.port, 10) : tls ? 443 : 80;
    const pathPrefix = parsed.pathname.replace(/^\/+|\/+$/g, '') || undefined;
    return { host, port, tls, pathPrefix };
  } catch {
    const clean = url.replace(/^https?:\/\//, '');
    const parts = clean.split('/');
    const hostPort = parts[0];
    const [host, portStr] = hostPort.split(':');
    const port = portStr ? parseInt(portStr, 10) : 11434;
    const tls = url.startsWith('https://');
    const pathPrefix = parts.slice(1).join('/') || undefined;
    return { host: host || 'localhost', port, tls, pathPrefix };
  }
}

function migrateServer(server: any): Server {
  if (server.host !== undefined) {
    return server as Server;
  }
  const { host, port, tls, pathPrefix } = parseLegacyUrl(server.url || '');
  return {
    id: server.id,
    name: server.name,
    host,
    port,
    tls,
    pathPrefix,
    apiKey: server.apiKey,
    enabled: server.enabled !== false,
    isCloud: server.isCloud ?? false,
    type: server.type || 'ollama',
  };
}

export function buildServerUrl(server: Server): string {
  const protocol = server.tls ? 'https' : 'http';
  let url = `${protocol}://${server.host}`;
  if (server.port && server.port !== (server.tls ? 443 : 80)) {
    url += `:${server.port}`;
  }
  if (server.pathPrefix) {
    const prefix = server.pathPrefix.replace(/^\/+|\/+$/g, '');
    if (prefix) {
      url += `/${prefix}`;
    }
  }
  return url;
}

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
            state.activeServerId === id
              ? (newServers.find((s) => s.enabled)?.id ?? null)
              : state.activeServerId;
          return { servers: newServers, activeServerId: newActiveId };
        }),

      setActive: (id) => {
        const server = get().servers.find((s) => s.id === id);
        if (server && server.enabled) {
          set({ activeServerId: id });
        }
      },

      getActiveServer: () => {
        const { servers, activeServerId } = get();
        const active = servers.find((s) => s.id === activeServerId);
        if (active && active.enabled) return active;
        return servers.find((s) => s.enabled);
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
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const needsMigration = state.servers.some(
          (s: any) => s.url !== undefined && s.host === undefined
        );
        if (needsMigration) {
          useServerStore.setState({
            servers: state.servers.map(migrateServer),
          });
        }
      },
    }
  )
);
