import type { MacroPreferences, UserProfile } from '@mealroulette/shared-types';

export const CLOUD_BACKUP_SCHEMA_VERSION = 1;

export interface CloudBackupPayload {
  schemaVersion: number;
  updatedAt: string;
  localStorage: Record<string, string>;
  preferences: MacroPreferences | null;
  userProfile: UserProfile | null;
}

function isMacroPreferences(v: unknown): v is MacroPreferences {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o['proteinTarget'] === 'number' &&
    typeof o['carbsTarget'] === 'number' &&
    typeof o['fatTarget'] === 'number'
  );
}

function isUserProfile(v: unknown): v is UserProfile {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o['likedTagCounts'] === 'object' &&
    o['likedTagCounts'] != null &&
    typeof o['passedTagCounts'] === 'object' &&
    o['passedTagCounts'] != null &&
    typeof o['likedMacroSum'] === 'object' &&
    o['likedMacroSum'] != null &&
    typeof o['passedMacroSum'] === 'object' &&
    o['passedMacroSum'] != null &&
    typeof o['likedCount'] === 'number' &&
    typeof o['passedCount'] === 'number'
  );
}

export function parseCloudBackupJson(text: string): CloudBackupPayload | null {
  try {
    const raw = JSON.parse(text) as unknown;
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    if (o['schemaVersion'] !== CLOUD_BACKUP_SCHEMA_VERSION) return null;
    if (typeof o['updatedAt'] !== 'string') return null;
    const lsRaw = o['localStorage'];
    if (!lsRaw || typeof lsRaw !== 'object') return null;
    const localStorage: Record<string, string> = {};
    for (const [k, val] of Object.entries(lsRaw as Record<string, unknown>)) {
      if (typeof val === 'string') localStorage[k] = val;
    }
    const prefs = o['preferences'];
    const prof = o['userProfile'];
    return {
      schemaVersion: CLOUD_BACKUP_SCHEMA_VERSION,
      updatedAt: o['updatedAt'],
      localStorage,
      preferences: prefs == null ? null : isMacroPreferences(prefs) ? prefs : null,
      userProfile: prof == null ? null : isUserProfile(prof) ? prof : null,
    };
  } catch {
    return null;
  }
}
