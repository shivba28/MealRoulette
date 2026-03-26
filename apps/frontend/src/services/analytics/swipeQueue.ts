/**
 * IndexedDB queue for swipe events when offline. Events are batched and sent
 * via requestIdleCallback to avoid blocking the main thread and preserve 60fps.
 *
 * Flow:
 * 1. RecipeCardDeck calls enqueueSwipe(recipeId, direction, timestamp, velocity) after each swipe.
 * 2. If online: schedule flush on requestIdleCallback (or next tick). If offline: event stays in queue.
 * 3. flush() drains queue in batches (20), POSTs to AnalyticsService, removes sent events.
 * 4. On 'online' event (App effect) we call flushSwipeQueue() so queued events are sent without blocking UI.
 *
 * Offline handling: enqueueSwipe is fire-and-forget; events persist in IndexedDB.
 * When the user comes back online, the 'online' listener triggers flush; requestIdleCallback
 * ensures we don't block the main thread, preserving 60fps deck animations.
 */

import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'mealroulette-analytics-queue';
const DB_VERSION = 1;
const STORE = 'swipes';
const INDEX_ORDER = 'by-order';

/** Snapshot of recipe used to update server-side user profile (tags + macros). */
export interface RecipeSnapshot {
  tags?: string[];
  protein?: number;
  carbs?: number;
  fat?: number;
  calories?: number;
}

export interface QueuedSwipeRow {
  id: string;
  recipeId: string;
  direction: 'left' | 'right';
  timestamp: number;
  velocity: number;
  order: number;
  /** Set when we have a stable userId (e.g. from auth). */
  userId?: string;
  /** Optional: sent to backend to update user profile for personalization. */
  recipeSnapshot?: RecipeSnapshot;
}

interface QueueSchema {
  [STORE]: {
    key: string;
    value: QueuedSwipeRow;
    indexes: { [INDEX_ORDER]: number };
  };
}

let dbPromise: Promise<IDBPDatabase<QueueSchema>> | null = null;

function getDB(): Promise<IDBPDatabase<QueueSchema>> {
  if (dbPromise === null) {
    dbPromise = openDB<QueueSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex(INDEX_ORDER, 'order', { unique: false });
        }
      },
    });
  }
  return dbPromise;
}

let nextOrder = 0;

/**
 * Enqueue a swipe event for later batch send. Call from deck after recordSwipe (non-blocking).
 * recipeSnapshot: optional; when provided, sent to backend to update user profile (tags + macros).
 */
export async function enqueueSwipe(
  recipeId: string,
  direction: 'left' | 'right',
  timestamp: number,
  velocity: number,
  recipeSnapshot?: RecipeSnapshot
): Promise<void> {
  const db = await getDB();
  const id = `swipe-${timestamp}-${Math.random().toString(36).slice(2, 10)}`;
  const order = nextOrder++;
  await db.add(STORE, {
    id,
    recipeId,
    direction,
    timestamp,
    velocity,
    order,
    ...(recipeSnapshot && { recipeSnapshot }),
  });
}

/**
 * Peek up to `limit` oldest events (by order) without removing. Used by flush.
 */
export async function peekQueue(limit: number): Promise<QueuedSwipeRow[]> {
  const db = await getDB();
  const tx = db.transaction(STORE, 'readonly');
  const index = tx.objectStore(STORE).index(INDEX_ORDER);
  const all = await index.getAll();
  const sorted = all.sort((a, b) => a.order - b.order);
  return sorted.slice(0, limit);
}

/**
 * Remove events by ids (after successful send).
 */
export async function removeFromQueue(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDB();
  const tx = db.transaction(STORE, 'readwrite');
  const store = tx.objectStore(STORE);
  for (const id of ids) {
    await store.delete(id);
  }
  await tx.done;
}

/**
 * Queue length (for tests / debug).
 */
export async function getQueueLength(): Promise<number> {
  const db = await getDB();
  return db.count(STORE);
}

/**
 * Clear queue (tests only).
 */
export async function clearSwipeQueue(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE, 'readwrite');
  await tx.objectStore(STORE).clear();
  await tx.done;
}
