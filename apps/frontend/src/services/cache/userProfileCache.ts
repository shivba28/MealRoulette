/**
 * IndexedDB persistence for dynamic user profile (offline + reload).
 * Profile is derived from like/pass patterns and used for personalized scoring.
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { UserProfile } from '@mealroulette/shared-types';

const DB_NAME = 'mealroulette-user-profile';
const DB_VERSION = 1;
const STORE = 'profile';
const KEY = 'default';

export interface UserProfileCacheSchema {
  [STORE]: {
    key: string;
    value: UserProfile;
  };
}

let dbPromise: Promise<IDBPDatabase<UserProfileCacheSchema>> | null = null;

function getDB(): Promise<IDBPDatabase<UserProfileCacheSchema>> {
  if (dbPromise === null) {
    dbPromise = openDB<UserProfileCacheSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      },
    });
  }
  return dbPromise;
}

export async function getStoredUserProfile(): Promise<UserProfile | null> {
  const db = await getDB();
  const value = await db.get(STORE, KEY);
  return value === undefined || value === null ? null : value;
}

export async function setStoredUserProfile(profile: UserProfile): Promise<void> {
  const db = await getDB();
  await db.put(STORE, profile, KEY);
}

export async function clearStoredUserProfile(): Promise<void> {
  const db = await getDB();
  await db.delete(STORE, KEY);
}
