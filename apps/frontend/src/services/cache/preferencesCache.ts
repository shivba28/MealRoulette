/**
 * IndexedDB persistence for macro preferences (offline + reload).
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { MacroPreferences } from '@mealroulette/shared-types';

const DB_NAME = 'mealroulette-preferences';
const DB_VERSION = 1;
const STORE = 'preferences';
const KEY = 'macro';

export interface PreferencesCacheSchema {
  [STORE]: {
    key: string;
    value: MacroPreferences;
  };
}

let dbPromise: Promise<IDBPDatabase<PreferencesCacheSchema>> | null = null;

function getDB(): Promise<IDBPDatabase<PreferencesCacheSchema>> {
  if (dbPromise === null) {
    dbPromise = openDB<PreferencesCacheSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      },
    });
  }
  return dbPromise;
}

export async function getStoredPreferences(): Promise<MacroPreferences | null> {
  const db = await getDB();
  return db.get(STORE, KEY) ?? null;
}

export async function setStoredPreferences(
  prefs: MacroPreferences
): Promise<void> {
  const db = await getDB();
  await db.put(STORE, prefs, KEY);
}

export async function clearStoredPreferences(): Promise<void> {
  const db = await getDB();
  await db.delete(STORE, KEY);
}
