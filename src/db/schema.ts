import * as SQLite from 'expo-sqlite';

// Conversation operations

import { Conversation, StoredMessage } from '../api/types';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('ollama.db');
    await initDB(dbInstance);
  }
  return dbInstance;
}

export async function initDB(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      model TEXT NOT NULL,
      system_prompt TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);

    CREATE TABLE IF NOT EXISTS repos (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      branch TEXT NOT NULL DEFAULT 'main',
      last_synced INTEGER,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_repos_created ON repos(created_at DESC);
  `);
}

export async function getConversations(): Promise<Conversation[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<any>('SELECT * FROM conversations ORDER BY updated_at DESC');
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    model: row.model,
    systemPrompt: row.system_prompt,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function insertConversation(conversation: Conversation): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    'INSERT INTO conversations (id, title, model, system_prompt, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [
      conversation.id,
      conversation.title,
      conversation.model,
      conversation.systemPrompt ?? null,
      conversation.createdAt,
      conversation.updatedAt,
    ]
  );
}

export async function deleteConversation(id: string): Promise<void> {
  const db = await getDB();
  await db.runAsync('DELETE FROM conversations WHERE id = ?', [id]);
}

export async function updateConversationTimestamp(id: string, timestamp: number): Promise<void> {
  const db = await getDB();
  await db.runAsync('UPDATE conversations SET updated_at = ? WHERE id = ?', [timestamp, id]);
}

export async function updateConversationTitle(id: string, title: string): Promise<void> {
  const db = await getDB();
  await db.runAsync('UPDATE conversations SET title = ? WHERE id = ?', [title, id]);
}

// Message operations

export async function getMessages(conversationId: string): Promise<StoredMessage[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
    [conversationId]
  );
  return rows.map((row) => ({
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  }));
}

export async function insertMessage(message: StoredMessage): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    'INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)',
    [message.id, message.conversationId, message.role, message.content, message.createdAt]
  );
}

// Repo types

export interface RepoRecord {
  id: string;
  name: string;
  url: string;
  branch: string;
  lastSynced: number | null;
  createdAt: number;
}

// Repo operations

export async function getRepos(): Promise<RepoRecord[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<any>('SELECT * FROM repos ORDER BY created_at DESC');
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    url: row.url,
    branch: row.branch,
    lastSynced: row.last_synced,
    createdAt: row.created_at,
  }));
}

export async function insertRepo(repo: RepoRecord): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    'INSERT INTO repos (id, name, url, branch, last_synced, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [repo.id, repo.name, repo.url, repo.branch, repo.lastSynced, repo.createdAt]
  );
}

export async function deleteRepoRecord(id: string): Promise<void> {
  const db = await getDB();
  await db.runAsync('DELETE FROM repos WHERE id = ?', [id]);
}

export async function updateRepoSynced(id: string, timestamp: number): Promise<void> {
  const db = await getDB();
  await db.runAsync('UPDATE repos SET last_synced = ? WHERE id = ?', [timestamp, id]);
}
