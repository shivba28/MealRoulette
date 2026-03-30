import { collectLocalBackup } from './collect';
import type { CloudBackupPayload } from './types';
import { parseCloudBackupJson } from './types';

export function getApiBase(): string {
  const b = import.meta.env.VITE_API_BASE_URL;
  if (typeof b === 'string' && b.trim() !== '') {
    return b.replace(/\/$/, '');
  }
  return '';
}

export async function fetchAuthMe(): Promise<{ authenticated: boolean; email?: string }> {
  try {
    const r = await fetch(`${getApiBase()}/api/auth/me`, { credentials: 'include' });
    if (!r.ok) return { authenticated: false };
    return (await r.json()) as { authenticated: boolean; email?: string };
  } catch {
    return { authenticated: false };
  }
}

export async function pushBackupToServer(payload: CloudBackupPayload): Promise<void> {
  const r = await fetch(`${getApiBase()}/api/sync/backup`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    const msg = typeof err?.error === 'string' ? err.error : r.statusText;
    throw new Error(msg || 'Upload failed');
  }
}

export async function pullBackupFromServer(): Promise<CloudBackupPayload | null> {
  const r = await fetch(`${getApiBase()}/api/sync/backup`, { credentials: 'include' });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    const msg = typeof err?.error === 'string' ? err.error : r.statusText;
    throw new Error(msg || 'Download failed');
  }
  const text = await r.text();
  return parseCloudBackupJson(text);
}

export async function logoutAuth(): Promise<void> {
  await fetch(`${getApiBase()}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}

export async function pushLocalBackupNow(): Promise<void> {
  const payload = await collectLocalBackup();
  await pushBackupToServer(payload);
}

export function startGoogleSignIn(): void {
  window.location.assign(`${getApiBase()}/api/auth/google/start`);
}
