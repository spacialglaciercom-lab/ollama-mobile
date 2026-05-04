import { assertSafePath, assertSafeRepoId } from '../gitClient';

jest.mock('expo-file-system', () => ({
  File: jest.fn(),
  Directory: jest.fn(),
  Paths: { document: { uri: 'file:///mock/' } }
}));

jest.mock('isomorphic-git', () => ({
  plugins: {
    set: jest.fn()
  }
}));

describe('gitClient Security Helpers', () => {
  describe('assertSafePath', () => {
    it('should not throw on valid paths', () => {
      expect(() => assertSafePath('valid/path.txt')).not.toThrow();
      expect(() => assertSafePath('valid-file.ts')).not.toThrow();
      expect(() => assertSafePath('src/api/gitClient.ts')).not.toThrow();
    });

    it('should throw on absolute paths', () => {
      expect(() => assertSafePath('/etc/passwd')).toThrow('Absolute paths are not allowed');
    });

    it('should throw on directory traversal', () => {
      expect(() => assertSafePath('../../../etc/passwd')).toThrow('Directory traversal is not allowed');
      expect(() => assertSafePath('some/valid/dir/../../invalid.txt')).toThrow('Directory traversal is not allowed');
    });

    it('should throw on null bytes', () => {
      expect(() => assertSafePath('valid/path\0.txt')).toThrow('Path contains null bytes');
    });
  });

  describe('assertSafeRepoId', () => {
    it('should not throw on valid repo IDs', () => {
      expect(() => assertSafeRepoId('my-repo-123')).not.toThrow();
      expect(() => assertSafeRepoId('react')).not.toThrow();
    });

    it('should throw on invalid repo IDs', () => {
      expect(() => assertSafeRepoId('my/repo')).toThrow('Invalid repository ID');
      expect(() => assertSafeRepoId('my\\repo')).toThrow('Invalid repository ID');
      expect(() => assertSafeRepoId('..')).toThrow('Invalid repository ID');
      expect(() => assertSafeRepoId('.')).toThrow('Invalid repository ID');
      expect(() => assertSafeRepoId('repo\0')).toThrow('Invalid repository ID');
    });
  });
});
