import { useDiagnosticsStore } from '../useDiagnosticsStore';

describe('useDiagnosticsStore secret redaction', () => {
  beforeEach(() => {
    useDiagnosticsStore.getState().clear();
  });

  it('should redact API keys from metadata', () => {
    const store = useDiagnosticsStore.getState();
    const sensitiveMetadata = {
      apiKey: 'sk-1234567890abcdef1234567890abcdef1234567890abcdef',
      other: 'public-data'
    };

    store.info('test', 'message with secret', sensitiveMetadata);

    const entries = useDiagnosticsStore.getState().entries;
    expect(entries[0].metadata?.apiKey).toBe('[REDACTED]');
    expect(entries[0].metadata?.other).toBe('public-data');
  });

  it('should redact tokens from metadata strings', () => {
    const store = useDiagnosticsStore.getState();
    const sensitiveMetadata = {
      auth: 'Bearer ghp_vWXYZ1234567890abcdef1234567890abcdef'
    };

    store.info('test', 'message with token', sensitiveMetadata);

    const entries = useDiagnosticsStore.getState().entries;
    expect(entries[0].metadata?.auth).toBe('Bearer [REDACTED]');
  });

  it('should redact passwords from nested objects', () => {
    const store = useDiagnosticsStore.getState();
    const sensitiveMetadata = {
      user: {
        username: 'jules',
        password: 'super-secret-password-123'
      }
    };

    store.info('test', 'nested secret', sensitiveMetadata);

    const entries = useDiagnosticsStore.getState().entries;
    expect(entries[0].metadata?.user.password).toBe('[REDACTED]');
    expect(entries[0].metadata?.user.username).toBe('jules');
  });
});
