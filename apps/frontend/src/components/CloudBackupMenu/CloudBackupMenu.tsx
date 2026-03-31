import { useCallback, useEffect, useRef, useState } from 'react';
import {
  applyCloudBackupPayload,
  captureAuthTokenFromUrl,
  collectLocalBackup,
  fetchAuthMe,
  logoutAuth,
  pullBackupFromServer,
  pushBackupToServer,
  pushLocalBackupNow,
  startGoogleSignIn,
} from '@/services/cloudBackup';
import { useMacroPreferenceStore } from '@/state/macroPreferenceStore';
import { useUserProfileStore } from '@/state/userProfileStore';

export interface CloudBackupMenuProps {
  /** Bumps when macro log changes (debounced upload). */
  dataVersion: number;
  onLocalRestored: () => void | Promise<void>;
}

type SyncStatus = 'idle' | 'syncing' | 'ok' | 'error';
type SyncSource = 'manual' | 'auto';

const LAST_SYNC_KEY = 'mr-drive-last-sync-at';
const LAST_SYNC_STATUS_KEY = 'mr-drive-last-sync-status';
const BOOTSTRAP_DONE_KEY = 'mr-drive-bootstrap-done';

function formatLocalTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CloudBackupMenu({ dataVersion, onLocalRestored }: CloudBackupMenuProps) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [lastSyncStatus, setLastSyncStatus] = useState<SyncStatus>('idle');
  const wrapRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const debounceRef = useRef<number | null>(null);

  const loadLastSync = useCallback(() => {
    try {
      const at = window.localStorage.getItem(LAST_SYNC_KEY);
      const st = window.localStorage.getItem(LAST_SYNC_STATUS_KEY) as SyncStatus | null;
      if (at) setLastSyncAt(at);
      if (st === 'idle' || st === 'syncing' || st === 'ok' || st === 'error') setLastSyncStatus(st);
    } catch {
      // ignore
    }
  }, []);

  const persistLastSync = useCallback((status: SyncStatus, at?: string) => {
    setLastSyncStatus(status);
    if (at) setLastSyncAt(at);
    try {
      window.localStorage.setItem(LAST_SYNC_STATUS_KEY, status);
      if (at) window.localStorage.setItem(LAST_SYNC_KEY, at);
    } catch {
      // ignore
    }
  }, []);

  const refreshMe = useCallback(async () => {
    const me = await fetchAuthMe();
    setAuthed(me.authenticated);
    setEmail(me.authenticated && me.email ? me.email : null);
  }, []);

  const bootstrapSync = useCallback(async () => {
    try {
      const already = window.localStorage.getItem(BOOTSTRAP_DONE_KEY) === '1';
      if (already) return;
      const me = await fetchAuthMe();
      if (!me.authenticated) return;

      setBanner('Checking Drive backup…');
      const local = await collectLocalBackup();
      const remote = await pullBackupFromServer();
      if (!remote) {
        await pushBackupToServer(local);
        setBanner('Backed up this device to Google Drive.');
      } else {
        const localTs = Date.parse(local.updatedAt);
        const remoteTs = Date.parse(remote.updatedAt);
        const shouldRestore =
          Number.isFinite(remoteTs) && Number.isFinite(localTs)
            ? remoteTs > localTs
            : Boolean(remote.updatedAt && !local.updatedAt);

        if (shouldRestore) {
          await applyCloudBackupPayload(remote);
          await onLocalRestored();
          setBanner('Restored from Google Drive.');
        } else {
          await pushBackupToServer(local);
          setBanner('Backed up this device to Google Drive.');
        }
      }
      window.localStorage.setItem(BOOTSTRAP_DONE_KEY, '1');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed');
    }
  }, [onLocalRestored]);

  useEffect(() => {
    const gotToken = captureAuthTokenFromUrl();
    void refreshMe();
    loadLastSync();
    const params = new URLSearchParams(window.location.search);
    const sync = params.get('sync');
    if (sync === 'ok') {
      setBanner('Signed in with Google. Your data can sync to Drive.');
      void refreshMe();
      void bootstrapSync();
      params.delete('sync');
      const qs = params.toString();
      window.history.replaceState(
        {},
        '',
        `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`
      );
    } else if (gotToken) {
      void bootstrapSync();
    } else if (sync === 'error') {
      const reason = params.get('reason') ?? 'unknown';
      setError(
        reason === 'no_refresh_token'
          ? 'Google did not return a refresh token. Remove Meal Roulette access in your Google account and sign in again.'
          : `Sign-in failed (${reason}).`
      );
      params.delete('sync');
      params.delete('reason');
      const qs = params.toString();
      window.history.replaceState(
        {},
        '',
        `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`
      );
    }
  }, [refreshMe, bootstrapSync]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    };
  }, []);

  const openMenu = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setVisible(true);
    setOpen(true);
  };

  const closeMenu = () => {
    setOpen(false);
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = window.setTimeout(() => {
      setVisible(false);
      closeTimerRef.current = null;
    }, 220);
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const el = wrapRef.current;
      const target = e.target as Node | null;
      if (el && target && !el.contains(target)) closeMenu();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open]);

  const runSync = useCallback(
    async (source: SyncSource) => {
      if (!authed) return;
      persistLastSync('syncing');
      try {
        setError(null);
        await pushLocalBackupNow();
        const at = new Date().toISOString();
        persistLastSync('ok', at);
        if (source === 'manual') {
          setBanner('Backed up to Google Drive.');
        }
      } catch (e) {
        persistLastSync('error');
        setError(e instanceof Error ? e.message : 'Sync failed');
      }
    },
    [authed, persistLastSync]
  );

  const schedulePush = useCallback(() => {
    if (!authed) return;
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      debounceRef.current = null;
      void runSync('auto');
    }, 12_000);
  }, [authed, runSync]);

  useEffect(() => {
    schedulePush();
  }, [dataVersion, authed, schedulePush]);

  useEffect(() => {
    if (!authed) return;
    const unsubPrefs = useMacroPreferenceStore.subscribe(() => {
      schedulePush();
    });
    const unsubProfile = useUserProfileStore.subscribe(() => {
      schedulePush();
    });
    return () => {
      unsubPrefs();
      unsubProfile();
    };
  }, [authed, schedulePush]);

  const handleSyncNow = async () => {
    if (!authed) return;
    setBusy(true);
    setError(null);
    try {
      await runSync('manual');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    if (!authed) return;
    if (
      !window.confirm(
        'Replace data on this device with the backup from Google Drive? This cannot be undone.'
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const remote = await pullBackupFromServer();
      if (!remote) {
        setError('Backup file is missing or invalid.');
        return;
      }
      await applyCloudBackupPayload(remote);
      await onLocalRestored();
      setBanner('Restored from Google Drive.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Restore failed');
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    setBusy(true);
    setError(null);
    try {
      await logoutAuth();
      setAuthed(false);
      setEmail(null);
      setBanner('Signed out.');
    } catch {
      setError('Sign out failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="header-cloud-backup" ref={wrapRef}>
      <button
        type="button"
        className="hbtn"
        onClick={() => {
          if (open) closeMenu();
          else openMenu();
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Google Drive backup"
      >
        <span className="header-cloud-backup__btn">
          <span>{open ? '▲ Drive' : 'Drive'}</span>
          {authed && lastSyncStatus !== 'idle' && (
            <span
              className={`header-cloud-backup__dot header-cloud-backup__dot--${lastSyncStatus}`}
              aria-label={
                lastSyncStatus === 'ok'
                  ? 'Last sync succeeded'
                  : lastSyncStatus === 'error'
                    ? 'Last sync failed'
                    : 'Syncing'
              }
            />
          )}
        </span>
      </button>
      {visible && (
        <div
          className={`header-cloud-backup__dropdown ${open ? '' : 'header-cloud-backup__dropdown--closing'}`}
          role="dialog"
          aria-label="Google Drive backup"
        >
          {banner && <p className="header-cloud-backup__banner">{banner}</p>}
          {error && <p className="header-cloud-backup__error">{error}</p>}
          {authed && (
            <p className="header-cloud-backup__status">
              <span className="header-cloud-backup__status-label">Last sync</span>{' '}
              <span className={`header-cloud-backup__status-value header-cloud-backup__status-value--${lastSyncStatus}`}>
                {lastSyncStatus === 'syncing'
                  ? 'Syncing…'
                  : lastSyncStatus === 'ok'
                    ? lastSyncAt
                      ? `OK · ${formatLocalTime(lastSyncAt)}`
                      : 'OK'
                    : lastSyncStatus === 'error'
                      ? 'Failed'
                      : '—'}
              </span>
            </p>
          )}
          {/*<p className="header-cloud-backup__hint">
            Sign in once; a secure cookie keeps you logged in even if site storage is cleared.
          </p>*/}
          {!authed ? (
            <button type="button" className="hbtn header-cloud-backup__full" onClick={startGoogleSignIn}>
              Sign in with Google
            </button>
          ) : (
            <>
              <div className="header-cloud-backup__email" title={email ?? ''}>
                {email ?? 'Signed in'}
              </div>
              <div className="header-cloud-backup__actions">
                <button
                  type="button"
                  className="hbtn"
                  disabled={busy}
                  onClick={() => void handleSyncNow()}
                >
                  Sync now
                </button>
                <button
                  type="button"
                  className="hbtn"
                  disabled={busy}
                  onClick={() => void handleRestore()}
                >
                  Restore
                </button>
                <button
                  type="button"
                  className="hbtn"
                  disabled={busy}
                  onClick={() => void handleLogout()}
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
