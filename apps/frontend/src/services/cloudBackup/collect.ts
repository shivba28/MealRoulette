import { getStoredPreferences } from '@/services/cache/preferencesCache';
import { getStoredUserProfile } from '@/services/cache/userProfileCache';
import { CLOUD_BACKUP_SCHEMA_VERSION, type CloudBackupPayload } from './types';
import { isAllowedLocalStorageKey } from './keys';

export async function collectLocalBackup(): Promise<CloudBackupPayload> {
  const snapshot: Record<string, string> = {};
  if (typeof window !== 'undefined' && window.localStorage) {
    const store = window.localStorage;
    for (let i = 0; i < store.length; i++) {
      const k = store.key(i);
      if (!k || !isAllowedLocalStorageKey(k)) continue;
      const v = store.getItem(k);
      if (v !== null) snapshot[k] = v;
    }
  }
  const preferences = await getStoredPreferences();
  const userProfile = await getStoredUserProfile();
  return {
    schemaVersion: CLOUD_BACKUP_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    localStorage: snapshot,
    preferences,
    userProfile,
  };
}
