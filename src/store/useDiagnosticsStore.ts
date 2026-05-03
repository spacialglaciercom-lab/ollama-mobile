import { MMKV } from 'react-native-mmkv';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const storage = new MMKV();

export type DiagnosticLevel = 'info' | 'warning' | 'error';

export interface DiagnosticEntry {
  id: string;
  timestamp: number;
  level: DiagnosticLevel;
  category: string;
  message: string;
  metadata?: Record<string, any>;
}

interface DiagnosticsStore {
  entries: DiagnosticEntry[];
  addEntry: (
    level: DiagnosticLevel,
    category: string,
    message: string,
    metadata?: Record<string, any>
  ) => void;
  info: (category: string, message: string, metadata?: Record<string, any>) => void;
  warning: (category: string, message: string, metadata?: Record<string, any>) => void;
  error: (category: string, message: string, metadata?: Record<string, any>) => void;
  clear: () => void;
  exportLogs: () => string;
  getRecent: (limit?: number) => DiagnosticEntry[];
}

// Secret redaction patterns
const SECRET_PATTERNS = [
  {
    regex: /(api[_-]?key|apikey)\s*[:=]\s*['"]?([a-zA-Z0-9]{20,})['"]?/gi,
    replacement: '$1: [REDACTED]',
  },
  { regex: /(token)\s*[:=]\s*['"]?([a-zA-Z0-9\-_.]{20,})['"]?/gi, replacement: '$1: [REDACTED]' },
  {
    regex: /(password|passwd|pwd)\s*[:=]\s*['"]?([^\s'"]{4,})['"]?/gi,
    replacement: '$1: [REDACTED]',
  },
  { regex: /(secret)\s*[:=]\s*['"]?([a-zA-Z0-9\-_]{16,})['"]?/gi, replacement: '$1: [REDACTED]' },
  { regex: /(Bearer\s+)([a-zA-Z0-9\-_.]+)/gi, replacement: '$1[REDACTED]' },
  { regex: /(sk-[a-zA-Z0-9]{48,})/gi, replacement: '[REDACTED]' }, // OpenAI-style keys
  { regex: /(ghp_[a-zA-Z0-9]{36,})/gi, replacement: '[REDACTED]' }, // GitHub PATs
  { regex: /(xox[baprs]-[a-zA-Z0-9-]{10,})/gi, replacement: '[REDACTED]' }, // Slack tokens
];

function redactSecrets(obj: any): any {
  if (typeof obj === 'string') {
    let result = obj;
    for (const pattern of SECRET_PATTERNS) {
      result = result.replace(pattern.regex, pattern.replacement);
    }
    return result;
  }

  if (Array.isArray(obj)) {
    return obj.map(redactSecrets);
  }

  if (obj !== null && typeof obj === 'object') {
    const redacted: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Check if key itself looks like a secret name
      const isSecretKey = /^(api[_-]?key|apikey|token|password|passwd|pwd|secret)$/i.test(key);
      if (isSecretKey && typeof value === 'string' && value.length > 3) {
        redacted[key] = '[REDACTED]';
      } else {
        redacted[key] = redactSecrets(value);
      }
    }
    return redacted;
  }

  return obj;
}

function createEntry(
  level: DiagnosticLevel,
  category: string,
  message: string,
  metadata?: Record<string, any>
): DiagnosticEntry {
  return {
    id: `diag-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp: Date.now(),
    level,
    category,
    message,
    metadata: metadata ? redactSecrets(metadata) : undefined,
  };
}

const MAX_ENTRIES = 500;

export const useDiagnosticsStore = create<DiagnosticsStore>()(
  persist(
    (set, get) => ({
      entries: [],

      addEntry: (level, category, message, metadata) => {
        const entry = createEntry(level, category, message, metadata);
        set((state) => {
          const newEntries = [entry, ...state.entries].slice(0, MAX_ENTRIES);
          return { entries: newEntries };
        });
      },

      info: (category, message, metadata) => {
        get().addEntry('info', category, message, metadata);
      },

      warning: (category, message, metadata) => {
        get().addEntry('warning', category, message, metadata);
      },

      error: (category, message, metadata) => {
        get().addEntry('error', category, message, metadata);
      },

      clear: () => {
        set({ entries: [] });
      },

      exportLogs: () => {
        const { entries } = get();
        const lines = entries.map((entry) => {
          const date = new Date(entry.timestamp).toISOString();
          const level = entry.level.toUpperCase().padEnd(7);
          const category = `[${entry.category}]`;
          const metadataStr = entry.metadata ? ` | ${JSON.stringify(entry.metadata)}` : '';
          return `${date} ${level} ${category} ${entry.message}${metadataStr}`;
        });
        return lines.join('\n');
      },

      getRecent: (limit = 50) => {
        const { entries } = get();
        return entries.slice(0, limit);
      },
    }),
    {
      name: 'ollama-diagnostics',
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
