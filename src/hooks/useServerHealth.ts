import { useState, useEffect, useCallback } from 'react';

import { pingServer } from '../api/ollamaClient';
import { useServerStore, buildServerUrl } from '../store/useServerStore';

interface UseServerHealthReturn {
  connected: boolean;
  checking: boolean;
  check: () => Promise<void>;
  lastCheck: number | null;
}

export function useServerHealth(): UseServerHealthReturn {
  const [connected, setConnected] = useState(false);
  const [checking, setChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<number | null>(null);

  const check = useCallback(async () => {
    const server = useServerStore.getState().getActiveServer();
    if (!server) {
      setConnected(false);
      return;
    }

    setChecking(true);
    const alive = await pingServer(buildServerUrl(server), server.apiKey);
    setConnected(alive);
    setChecking(false);
    setLastCheck(Date.now());
  }, []);

  // Auto-check on mount
  useEffect(() => {
    check();
    // Re-check every 60 seconds
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [check]);

  return { connected, checking, check, lastCheck };
}
