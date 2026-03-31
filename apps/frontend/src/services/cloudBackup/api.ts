import { collectLocalBackup } from './collect';
import type { CloudBackupPayload } from './types';
import { parseCloudBackupJson } from './types';

const AUTH_TOKEN_KEY = 'mr_auth_token';

export function getApiBase(): string {
  const b = import.meta.env.VITE_API_BASE_URL;
  if (typeof b === 'string' && b.trim() !== '') {
    return b.replace(/\/$/, '');
  }
  return '';
}

export function getAuthToken(): string | null {
  try {
    const t = window.localStorage.getItem(AUTH_TOKEN_KEY);
    return t && t.trim() !== '' ? t : null;
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (!token) window.localStorage.removeItem(AUTH_TOKEN_KEY);
    else window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

export function captureAuthTokenFromUrl(): boolean {
  try {
    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(hash);
    const token = params.get('token');
    if (!token) return false;
    setAuthToken(token);
    params.delete('token');
    const nextHash = params.toString();
    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}${window.location.search}${nextHash ? `#${nextHash}` : ''}`
    );
    return true;
  } catch {
    return false;
  }
}

function authHeaders(): HeadersInit | undefined {
  const t = getAuthToken();
  if (!t) return undefined;
  return { Authorization: `Bearer ${t}` };
}

export async function fetchAuthMe(): Promise<{ authenticated: boolean; email?: string }> {
  try {
    const h = authHeaders();
    const r = await fetch(`${getApiBase()}/api/auth/me`, h ? { headers: h } : undefined);
    if (!r.ok) return { authenticated: false };
    return (await r.json()) as { authenticated: boolean; email?: string };
  } catch {
    return { authenticated: false };
  }
}

export async function pushBackupToServer(payload: CloudBackupPayload): Promise<void> {
  const r = await fetch(`${getApiBase()}/api/sync/backup`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(authHeaders() ?? {}),
    },
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    const msg = typeof err?.error === 'string' ? err.error : r.statusText;
    throw new Error(msg || 'Upload failed');
  }
}

export async function pullBackupFromServer(): Promise<CloudBackupPayload | null> {
  const h = authHeaders();
  const r = await fetch(`${getApiBase()}/api/sync/backup`, h ? { headers: h } : undefined);
  if (r.status === 404) return null;
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    const msg = typeof err?.error === 'string' ? err.error : r.statusText;
    throw new Error(msg || 'Download failed');
  }
  const text = await r.text();
  return parseCloudBackupJson(text);
}

export async function logoutAuth(): Promise<void> {
  const h = authHeaders();
  await fetch(
    `${getApiBase()}/api/auth/logout`,
    h ? { method: 'POST', headers: h } : { method: 'POST' }
  );
  setAuthToken(null);
}

export async function pushLocalBackupNow(): Promise<void> {
  const payload = await collectLocalBackup();
  await pushBackupToServer(payload);
}

export function startGoogleSignIn(): void {
  window.location.assign(`${getApiBase()}/api/auth/google/start`);
}
