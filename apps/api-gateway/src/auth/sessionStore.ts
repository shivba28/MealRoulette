import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { config } from '../config/env.js';
import { open, seal } from '../crypto/secretBox.js';

const FILE_NAME = 'sessions.json';

export interface SessionRecord {
  encryptedRefreshToken: string;
  googleSub: string;
  email: string;
  driveFileId?: string;
  createdAt: string;
}

interface StoreFile {
  sessions: Record<string, SessionRecord>;
}

function storePath(): string {
  const dir = join(process.cwd(), config.dataDir);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return join(dir, FILE_NAME);
}

function readStore(): StoreFile {
  const path = storePath();
  if (!existsSync(path)) {
    return { sessions: {} };
  }
  try {
    const raw = readFileSync(path, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || !('sessions' in parsed)) {
      return { sessions: {} };
    }
    const sessions = (parsed as StoreFile).sessions;
    if (!sessions || typeof sessions !== 'object') {
      return { sessions: {} };
    }
    return { sessions: sessions as Record<string, SessionRecord> };
  } catch {
    return { sessions: {} };
  }
}

function atomicWrite(path: string, data: string): void {
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, data, 'utf8');
  renameSync(tmp, path);
}

function writeStore(store: StoreFile): void {
  atomicWrite(storePath(), JSON.stringify(store, null, 2));
}

export function createSession(params: {
  refreshToken: string;
  googleSub: string;
  email: string;
}): string {
  const sessionId = randomBytes(32).toString('hex');
  const store = readStore();
  store.sessions[sessionId] = {
    encryptedRefreshToken: seal(params.refreshToken, config.sessionSecret),
    googleSub: params.googleSub,
    email: params.email,
    createdAt: new Date().toISOString(),
  };
  writeStore(store);
  return sessionId;
}

export function getSession(sessionId: string): SessionRecord | null {
  const store = readStore();
  return store.sessions[sessionId] ?? null;
}

function newer(a: SessionRecord, b: SessionRecord): SessionRecord {
  const at = Date.parse(a.createdAt);
  const bt = Date.parse(b.createdAt);
  if (!Number.isFinite(at) || !Number.isFinite(bt)) return a;
  return at >= bt ? a : b;
}

export function getLatestSessionForGoogleSub(googleSub: string): SessionRecord | null {
  const store = readStore();
  let best: SessionRecord | null = null;
  for (const rec of Object.values(store.sessions)) {
    if (rec.googleSub !== googleSub) continue;
    best = best ? newer(best, rec) : rec;
  }
  return best;
}

export function deleteSession(sessionId: string): void {
  const store = readStore();
  if (store.sessions[sessionId]) {
    delete store.sessions[sessionId];
    writeStore(store);
  }
}

export function setDriveFileId(sessionId: string, driveFileId: string): void {
  const store = readStore();
  const rec = store.sessions[sessionId];
  if (rec) {
    rec.driveFileId = driveFileId;
    writeStore(store);
  }
}

export function getRefreshToken(sessionId: string): string | null {
  const rec = getSession(sessionId);
  if (!rec) return null;
  try {
    return open(rec.encryptedRefreshToken, config.sessionSecret);
  } catch {
    return null;
  }
}

export function getLatestRefreshTokenForGoogleSub(googleSub: string): string | null {
  const rec = getLatestSessionForGoogleSub(googleSub);
  if (!rec) return null;
  try {
    return open(rec.encryptedRefreshToken, config.sessionSecret);
  } catch {
    return null;
  }
}
