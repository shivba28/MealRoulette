import { setStoredPreferences } from '@/services/cache/preferencesCache';
import { setStoredUserProfile } from '@/services/cache/userProfileCache';
import type { CloudBackupPayload } from './types';
import { isAllowedLocalStorageKey } from './keys';

export async function applyCloudBackupPayload(data: CloudBackupPayload): Promise<void> {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const store = window.localStorage;
  for (const [k, v] of Object.entries(data.localStorage)) {
    if (!isAllowedLocalStorageKey(k)) continue;
    try {
      store.setItem(k, v);
    } catch {
      // quota or private mode
    }
  }
  if (data.preferences) {
    await setStoredPreferences(data.preferences);
  }
  if (data.userProfile) {
    await setStoredUserProfile(data.userProfile);
  }
}
