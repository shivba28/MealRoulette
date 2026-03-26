/**
 * IndexedDB-backed image cache for instant render and offline.
 *
 * Strategy:
 * - Store images as data URLs (base64) keyed by request URL.
 * - LRU eviction: when count > MAX_IMAGES (200), delete oldest by order.
 * - On render we check cache first; on miss we fetch, convert to data URL, store.
 * - Reuse cached data URL in <img src> to avoid re-download; keeps 60fps and offline.
 */

import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'mealroulette-images';
const DB_VERSION = 1;
const STORE_IMAGES = 'images';
const INDEX_ORDER = 'by-order';
const MAX_IMAGES = 200;

export interface CachedImageRow {
  url: string;
  dataUrl: string;
  order: number;
}

export interface ImageCacheSchema {
  [STORE_IMAGES]: {
    key: string;
    value: CachedImageRow;
    indexes: { [INDEX_ORDER]: number };
  };
}

let dbPromise: Promise<IDBPDatabase<ImageCacheSchema>> | null = null;

function getDB(): Promise<IDBPDatabase<ImageCacheSchema>> {
  if (dbPromise === null) {
    dbPromise = openDB<ImageCacheSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_IMAGES)) {
          const store = db.createObjectStore(STORE_IMAGES, { keyPath: 'url' });
          store.createIndex(INDEX_ORDER, 'order', { unique: false });
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Get cached image as data URL if present.
 */
export async function getCachedImage(url: string): Promise<string | null> {
  const db = await getDB();
  const row = await db.get(STORE_IMAGES, url);
  return row?.dataUrl ?? null;
}

/**
 * Store image as data URL. LRU evict if over MAX_IMAGES.
 */
export async function setCachedImage(
  url: string,
  dataUrl: string
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_IMAGES, 'readwrite');
  const store = tx.objectStore(STORE_IMAGES);
  const index = store.index(INDEX_ORDER);
  const all = await index.getAll();
  const maxOrder = all.length === 0 ? 0 : Math.max(...all.map((r) => r.order));
  await store.put({ url, dataUrl, order: maxOrder + 1 });
  const count = await store.count();
  if (count > MAX_IMAGES) {
    const toEvict = count - MAX_IMAGES;
    const sorted = (await index.getAll()).sort((a, b) => a.order - b.order);
    for (let i = 0; i < toEvict && i < sorted.length; i++) {
      await store.delete(sorted[i]!.url);
    }
  }
  await tx.done;
}

/**
 * Fetch image from network and return as data URL. Fails on non-2xx or non-image.
 */
export async function fetchImageAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Resolve image URL: cache first, then fetch and store. Returns data URL or original URL on error.
 */
export async function resolveImageUrl(url: string): Promise<string> {
  const cached = await getCachedImage(url);
  if (cached) return cached;
  try {
    const dataUrl = await fetchImageAsDataUrl(url);
    await setCachedImage(url, dataUrl);
    return dataUrl;
  } catch {
    return url;
  }
}

/**
 * Count of images in cache (for tests / debug).
 */
export async function getImageCacheCount(): Promise<number> {
  const db = await getDB();
  return db.count(STORE_IMAGES);
}

/**
 * Clear image cache (tests or user action).
 */
export async function clearImageCache(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_IMAGES, 'readwrite');
  await tx.objectStore(STORE_IMAGES).clear();
  await tx.done;
}
