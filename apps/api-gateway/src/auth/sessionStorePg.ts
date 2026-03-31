import { randomBytes } from 'node:crypto';
import pg from 'pg';
import { config } from '../config/env.js';
import { open, seal } from '../crypto/secretBox.js';

const { Pool } = pg;

export interface SessionRecord {
  encryptedRefreshToken: string;
  googleSub: string;
  email: string;
  driveFileId?: string;
  createdAt: string;
}

let pool: pg.Pool | null = null;
let initPromise: Promise<void> | null = null;

function getPool(): pg.Pool {
  if (pool) return pool;
  const url = process.env['DATABASE_URL'];
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }
  pool = new Pool({
    connectionString: url,
    ssl: process.env['PGSSLMODE'] === 'disable' ? undefined : { rejectUnauthorized: false },
  });
  return pool;
}

async function init(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const p = getPool();
    await p.query(`
      create table if not exists mr_sessions (
        id text primary key,
        encrypted_refresh_token text not null,
        google_sub text not null,
        email text not null,
        drive_file_id text null,
        created_at timestamptz not null default now()
      );
    `);
    await p.query(`create index if not exists mr_sessions_google_sub_created_at on mr_sessions (google_sub, created_at desc);`);
  })();
  return initPromise;
}

function rowToRecord(row: any): SessionRecord {
  const driveFileId = row.drive_file_id ? String(row.drive_file_id) : undefined;
  return {
    encryptedRefreshToken: String(row.encrypted_refresh_token),
    googleSub: String(row.google_sub),
    email: String(row.email),
    ...(driveFileId ? { driveFileId } : {}),
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : typeof row.created_at === 'string'
          ? row.created_at
          : new Date(row.created_at).toISOString(),
  };
}

export async function createSession(params: {
  refreshToken: string;
  googleSub: string;
  email: string;
}): Promise<string> {
  await init();
  const id = randomBytes(32).toString('hex');
  const encrypted = seal(params.refreshToken, config.sessionSecret);
  await getPool().query(
    `
      insert into mr_sessions (id, encrypted_refresh_token, google_sub, email, created_at)
      values ($1, $2, $3, $4, now())
    `,
    [id, encrypted, params.googleSub, params.email]
  );
  return id;
}

export async function getSession(sessionId: string): Promise<SessionRecord | null> {
  await init();
  const r = await getPool().query(
    `select id, encrypted_refresh_token, google_sub, email, drive_file_id, created_at from mr_sessions where id = $1 limit 1`,
    [sessionId]
  );
  const row = r.rows?.[0];
  return row ? rowToRecord(row) : null;
}

export async function getLatestSessionForGoogleSub(googleSub: string): Promise<SessionRecord | null> {
  await init();
  const r = await getPool().query(
    `
      select encrypted_refresh_token, google_sub, email, drive_file_id, created_at
      from mr_sessions
      where google_sub = $1
      order by created_at desc
      limit 1
    `,
    [googleSub]
  );
  const row = r.rows?.[0];
  return row ? rowToRecord(row) : null;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await init();
  await getPool().query(`delete from mr_sessions where id = $1`, [sessionId]);
}

export async function setDriveFileId(sessionId: string, driveFileId: string): Promise<void> {
  await init();
  await getPool().query(`update mr_sessions set drive_file_id = $2 where id = $1`, [
    sessionId,
    driveFileId,
  ]);
}

export async function getRefreshToken(sessionId: string): Promise<string | null> {
  const rec = await getSession(sessionId);
  if (!rec) return null;
  try {
    return open(rec.encryptedRefreshToken, config.sessionSecret);
  } catch {
    return null;
  }
}

export async function getLatestRefreshTokenForGoogleSub(googleSub: string): Promise<string | null> {
  const rec = await getLatestSessionForGoogleSub(googleSub);
  if (!rec) return null;
  try {
    return open(rec.encryptedRefreshToken, config.sessionSecret);
  } catch {
    return null;
  }
}

