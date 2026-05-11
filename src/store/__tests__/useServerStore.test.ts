import { parseLegacyUrl } from '../useServerStore';

describe('parseLegacyUrl', () => {
  it('should parse http urls with port', () => {
    const result = parseLegacyUrl('http://192.168.1.100:11434');
    expect(result).toEqual({
      host: '192.168.1.100',
      port: 11434,
      tls: false,
      pathPrefix: undefined,
    });
  });

  it('should parse https urls without port (defaulting to 443)', () => {
    const result = parseLegacyUrl('https://example.com');
    expect(result).toEqual({
      host: 'example.com',
      port: 443,
      tls: true,
      pathPrefix: undefined,
    });
  });

  it('should parse http urls without port (defaulting to 80)', () => {
    const result = parseLegacyUrl('http://example.com');
    expect(result).toEqual({
      host: 'example.com',
      port: 80,
      tls: false,
      pathPrefix: undefined,
    });
  });

  it('should parse urls with path prefix', () => {
    const result = parseLegacyUrl('http://example.com:8080/api/v1');
    expect(result).toEqual({
      host: 'example.com',
      port: 8080,
      tls: false,
      pathPrefix: 'api/v1',
    });
  });

  it('should parse urls with path prefix with trailing slash', () => {
    const result = parseLegacyUrl('https://example.com/api/v1/');
    expect(result).toEqual({
      host: 'example.com',
      port: 443,
      tls: true,
      pathPrefix: 'api/v1',
    });
  });

  it('should fallback to clean parsing for invalid URLs (e.g. missing protocol)', () => {
    const result = parseLegacyUrl('192.168.1.100:11434');
    expect(result).toEqual({
      host: '192.168.1.100',
      port: 11434,
      tls: false,
      pathPrefix: undefined,
    });
  });

  it('should fallback to clean parsing for invalid URLs without port (defaulting to 11434)', () => {
    const result = parseLegacyUrl('192.168.1.100');
    expect(result).toEqual({
      host: '192.168.1.100',
      port: 11434,
      tls: false,
      pathPrefix: undefined,
    });
  });

  it('should fallback to clean parsing for invalid URLs with path', () => {
    const result = parseLegacyUrl('192.168.1.100/api/v1');
    expect(result).toEqual({
      host: '192.168.1.100',
      port: 11434,
      tls: false,
      pathPrefix: 'api/v1',
    });
  });

  it('should default to localhost if host is empty in fallback', () => {
    const result = parseLegacyUrl(':11434');
    expect(result).toEqual({
      host: 'localhost',
      port: 11434,
      tls: false,
      pathPrefix: undefined,
    });
  });
});
