import { Buffer } from 'buffer';
import { File, Directory, Paths } from 'expo-file-system';
import * as git from 'isomorphic-git';

// Polyfill Buffer for isomorphic-git
if (typeof global.Buffer === 'undefined') {
  (global as any).Buffer = Buffer;
}

// ── expo-file-system adapter for isomorphic-git ──
// Uses the new expo-file-system v55 API (File, Directory, Paths)

const expoFS: any = {
  promises: {
    readFile: async (path: string, opts?: { encoding?: string }) => {
      const file = new File(path);
      if (!file.exists) throw new Error(`ENOENT: no such file '${path}'`);
      if (opts && opts.encoding === 'utf8') {
        return await file.text();
      }
      const base64 = await file.base64();
      return Buffer.from(base64, 'base64');
    },

    writeFile: async (path: string, data: string | Buffer, opts?: { encoding?: string }) => {
      const dirPath = path.substring(0, path.lastIndexOf('/'));
      const dir = new Directory(dirPath);
      if (!dir.exists) {
        dir.create({ intermediates: true, idempotent: true });
      }
      const file = new File(path);
      if (typeof data === 'string') {
        file.write(data);
      } else {
        file.write(data);
      }
    },

    mkdir: async (path: string) => {
      const dir = new Directory(path);
      dir.create({ intermediates: true, idempotent: true });
    },

    rmdir: async (path: string) => {
      const dir = new Directory(path);
      if (dir.exists) dir.delete();
    },

    unlink: async (path: string) => {
      const file = new File(path);
      if (file.exists) file.delete();
    },

    readdir: async (path: string) => {
      const dir = new Directory(path);
      if (!dir.exists) throw new Error(`ENOENT: no such directory '${path}'`);
      const items = dir.list();
      return items.map((item: any) => item.name);
    },

    stat: async (path: string) => {
      // Try as file first, then directory
      const file = new File(path);
      const dir = new Directory(path);
      if (file.exists) {
        return {
          type: 'file' as const,
          mode: 0o666,
          size: file.size,
          ino: 0,
          dev: 0,
          mtimeMs: file.modificationTime ?? Date.now(),
        };
      }
      if (dir.exists) {
        return {
          type: 'directory' as const,
          mode: 0o666,
          size: dir.size ?? 0,
          ino: 0,
          dev: 0,
          mtimeMs: Date.now(),
        };
      }
      throw new Error(`ENOENT: no such file '${path}'`);
    },

    lstat: async (path: string) => {
      // Same as stat — no symlink support
      const file = new File(path);
      const dir = new Directory(path);
      if (file.exists) {
        return {
          type: 'file' as const,
          mode: 0o666,
          size: file.size,
          ino: 0,
          dev: 0,
          mtimeMs: file.modificationTime ?? Date.now(),
        };
      }
      if (dir.exists) {
        return {
          type: 'directory' as const,
          mode: 0o666,
          size: dir.size ?? 0,
          ino: 0,
          dev: 0,
          mtimeMs: Date.now(),
        };
      }
      throw new Error(`ENOENT: no such file '${path}'`);
    },

    readlink: async () => {
      throw new Error('ENOSYS: readlink not supported');
    },

    symlink: async () => {
      throw new Error('ENOSYS: symlink not supported');
    },

    chmod: async () => {
      // no-op on expo-fs
    },
  },
};

// Initialize isomorphic-git with our filesystem
(git as any).plugins.set('fs', expoFS);

// ── Repo types ──

export interface CloneProgress {
  phase: string;
  loaded: number;
  total: number;
}

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
}

export interface GitLogEntry {
  oid: string;
  message: string;
  author: { name: string; email: string };
  timestamp: number;
}

export interface GitStatusResult {
  modified: string[];
  added: string[];
  deleted: string[];
  untracked: string[];
  ahead: number;
  behind: number;
}

// ── Base directory for all cloned repos ──

export function getReposBaseDir(): string {
  return `${Paths.document.uri}repos`;
}

export function getRepoDir(repoId: string): string {
  return `${getReposBaseDir()}/${repoId}`;
}

// ── Git operations ──

export async function cloneRepo(
  url: string,
  repoId: string,
  branch: string = 'main',
  pat?: string,
  onProgress?: (progress: CloneProgress) => void,
  depth: number = 1
): Promise<void> {
  const dirPath = getRepoDir(repoId);
  const dir = new Directory(dirPath);
  dir.create({ intermediates: true, idempotent: true });

  const authCallbacks: any = {};
  if (pat) {
    authCallbacks.onAuth = () => ({
      username: pat,
      password: '',
    });
  }

  await git.clone({
    fs: expoFS,
    http: require('isomorphic-git/http/web'),
    dir: dirPath,
    url,
    ref: branch,
    depth,
    singleBranch: true,
    onProgress: onProgress
      ? (event: { phase: string; loaded: number; total: number }) => {
          onProgress({
            phase: event.phase,
            loaded: event.loaded,
            total: event.total,
          });
        }
      : undefined,
    ...authCallbacks,
  });
}

export async function pullRepo(
  repoId: string,
  branch: string = 'main',
  pat?: string
): Promise<void> {
  const dirPath = getRepoDir(repoId);

  const authCallbacks: any = {};
  if (pat) {
    authCallbacks.onAuth = () => ({
      username: pat,
      password: '',
    });
  }

  await git.pull({
    fs: expoFS,
    http: require('isomorphic-git/http/web'),
    dir: dirPath,
    ref: branch,
    singleBranch: true,
    ...authCallbacks,
  });
}

export async function pushRepo(
  repoId: string,
  branch: string = 'main',
  pat?: string
): Promise<void> {
  const dirPath = getRepoDir(repoId);

  const authCallbacks: any = {};
  if (pat) {
    authCallbacks.onAuth = () => ({
      username: pat,
      password: '',
    });
  }

  await git.push({
    fs: expoFS,
    http: require('isomorphic-git/http/web'),
    dir: dirPath,
    ref: branch,
    ...authCallbacks,
  });
}

export async function commitChanges(
  repoId: string,
  message: string,
  author: { name: string; email: string }
): Promise<string> {
  const dirPath = getRepoDir(repoId);

  // Stage all changes
  await git.add({ fs: expoFS, dir: dirPath, filepath: '.' });

  const oid = await git.commit({
    fs: expoFS,
    dir: dirPath,
    message,
    author: {
      name: author.name,
      email: author.email,
    },
  });

  return oid;
}

export async function getStatus(repoId: string): Promise<GitStatusResult> {
  const dirPath = getRepoDir(repoId);

  const statusMatrix = await git.statusMatrix({ fs: expoFS, dir: dirPath });

  const modified: string[] = [];
  const added: string[] = [];
  const deleted: string[] = [];
  const untracked: string[] = [];

  for (const row of statusMatrix) {
    const [filepath, headStatus, workdirStatus, stageStatus] = row as [
      string,
      number,
      number,
      number,
    ];
    if (headStatus === 0 && workdirStatus === 2 && stageStatus === 2) {
      added.push(filepath);
    } else if (headStatus === 1 && workdirStatus === 0 && stageStatus === 0) {
      deleted.push(filepath);
    } else if (headStatus === 1 && workdirStatus === 2 && stageStatus === 2) {
      modified.push(filepath);
    } else if (headStatus === 1 && workdirStatus === 2 && stageStatus === 1) {
      modified.push(filepath);
    } else if (headStatus === 0 && workdirStatus === 2 && stageStatus === 0) {
      untracked.push(filepath);
    }
  }

  // Ahead/behind
  let ahead = 0;
  let behind = 0;
  try {
    const branch = (await git.currentBranch({ fs: expoFS, dir: dirPath })) as string | undefined;
    if (branch) {
      const localOids = await git.log({ fs: expoFS, dir: dirPath, ref: branch, depth: 50 });
      const remoteOids = await git.log({
        fs: expoFS,
        dir: dirPath,
        ref: `remotes/origin/${branch}`,
        depth: 50,
      });
      const localSet = new Set(localOids.map((c: any) => c.oid));
      const remoteSet = new Set(remoteOids.map((c: any) => c.oid));
      ahead = localOids.filter((c: any) => !remoteSet.has(c.oid)).length;
      behind = remoteOids.filter((c: any) => !localSet.has(c.oid)).length;
    }
  } catch {
    // No remote tracking branch yet
  }

  return { modified, added, deleted, untracked, ahead, behind };
}

export async function getLog(repoId: string, depth: number = 20): Promise<GitLogEntry[]> {
  const dirPath = getRepoDir(repoId);
  const commits = await git.log({ fs: expoFS, dir: dirPath, depth });
  return (commits as any[]).map((c) => ({
    oid: c.oid,
    message: c.commit.message,
    author: {
      name: c.commit.author.name,
      email: c.commit.author.email,
    },
    timestamp: c.commit.author.timestamp * 1000,
  }));
}

export async function getCurrentBranch(repoId: string): Promise<string | undefined> {
  const dirPath = getRepoDir(repoId);
  const result = await git.currentBranch({ fs: expoFS, dir: dirPath });
  return result as string | undefined;
}

// ── File operations ──

export async function listDir(repoId: string, subPath: string = ''): Promise<FileEntry[]> {
  const dirPath = subPath ? `${getRepoDir(repoId)}/${subPath}` : getRepoDir(repoId);
  const dir = new Directory(dirPath);

  if (!dir.exists) return [];

  const items = dir.list();

  const entries: FileEntry[] = [];
  for (const item of items) {
    const name = item.name;
    // Skip .git directory
    if (name === '.git') continue;
    const itemPath = subPath ? `${subPath}/${name}` : name;
    const isDir = item instanceof Directory;
    entries.push({
      name,
      path: itemPath,
      isDirectory: isDir,
      size: isDir ? 0 : ((item as any).size ?? 0),
    });
  }

  // Sort: directories first, then alphabetically
  entries.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return entries;
}

export async function readFile(repoId: string, filePath: string): Promise<string> {
  const dirPath = getRepoDir(repoId);
  const file = new File(`${dirPath}/${filePath}`);
  return await file.text();
}

export async function writeFile(repoId: string, filePath: string, content: string): Promise<void> {
  const dirPath = getRepoDir(repoId);
  const fullPath = `${dirPath}/${filePath}`;
  const parentDirPath = fullPath.substring(0, fullPath.lastIndexOf('/'));
  const parentDir = new Directory(parentDirPath);
  if (!parentDir.exists) {
    parentDir.create({ intermediates: true, idempotent: true });
  }
  const file = new File(fullPath);
  file.write(content);
}

export async function deleteFile(repoId: string, filePath: string): Promise<void> {
  const dirPath = getRepoDir(repoId);
  const file = new File(`${dirPath}/${filePath}`);
  if (file.exists) file.delete();
}

export async function deleteRepo(repoId: string): Promise<void> {
  const dirPath = getRepoDir(repoId);
  const dir = new Directory(dirPath);
  if (dir.exists) dir.delete();
}

export async function repoExists(repoId: string): Promise<boolean> {
  const dirPath = getRepoDir(repoId);
  const dir = new Directory(dirPath);
  return dir.exists;
}
