export type { SessionRecord } from './sessionStoreFile.js';

type Impl = typeof import('./sessionStoreFile.js');

let implPromise: Promise<Impl> | null = null;

async function impl(): Promise<Impl> {
  if (implPromise) return implPromise;
  implPromise = (async () => {
    if (process.env['DATABASE_URL']) {
      return (await import('./sessionStorePg.js')) as unknown as Impl;
    }
    return (await import('./sessionStoreFile.js')) as unknown as Impl;
  })();
  return implPromise;
}

export async function createSession(params: {
  refreshToken: string;
  googleSub: string;
  email: string;
}): Promise<string> {
  const i = await impl();
  return (i as any).createSession(params);
}

export async function getSession(sessionId: string) {
  const i = await impl();
  return (i as any).getSession(sessionId);
}

export async function getLatestSessionForGoogleSub(googleSub: string) {
  const i = await impl();
  return (i as any).getLatestSessionForGoogleSub(googleSub);
}

export async function deleteSession(sessionId: string): Promise<void> {
  const i = await impl();
  return (i as any).deleteSession(sessionId);
}

export async function setDriveFileId(sessionId: string, driveFileId: string): Promise<void> {
  const i = await impl();
  return (i as any).setDriveFileId(sessionId, driveFileId);
}

export async function getRefreshToken(sessionId: string): Promise<string | null> {
  const i = await impl();
  return (i as any).getRefreshToken(sessionId);
}

export async function getLatestRefreshTokenForGoogleSub(googleSub: string): Promise<string | null> {
  const i = await impl();
  return (i as any).getLatestRefreshTokenForGoogleSub(googleSub);
}
