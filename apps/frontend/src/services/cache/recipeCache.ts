/**
 * IndexedDB-backed recipe cache for offline support and fast first paint.
 *
 * Caching strategy:
 * - Recipes are stored in a queue (order field) for FIFO consumption by the deck.
 * - LRU eviction: when count > MAX_RECIPES (500), we delete oldest by order.
 * - On app start we read from cache first; API fills gaps and refills cache.
 * - Prefetch runs when deck has < 3 cards; new batch is written to cache without blocking UI.
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { Recipe } from '@mealroulette/shared-types';

const DB_NAME = 'mealroulette-recipes';
const DB_VERSION = 1;
const STORE_RECIPES = 'recipes';
const INDEX_ORDER = 'by-order';
const MAX_RECIPES = 500;

export interface CachedRecipeRow {
  id: string;
  recipe: Recipe;
  order: number;
}

let dbPromise: Promise<IDBPDatabase<RecipeCacheSchema>> | null = null;

export interface RecipeCacheSchema {
  [STORE_RECIPES]: {
    key: string;
    value: CachedRecipeRow;
    indexes: { [INDEX_ORDER]: number };
  };
}

function getDB(): Promise<IDBPDatabase<RecipeCacheSchema>> {
  if (dbPromise === null) {
    dbPromise = openDB<RecipeCacheSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_RECIPES)) {
          const store = db.createObjectStore(STORE_RECIPES, { keyPath: 'id' });
          store.createIndex(INDEX_ORDER, 'order', { unique: false });
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Get up to `limit` recipes from cache (oldest by order), and remove them from the store.
 * So the deck "consumes" from cache; next call gets the next batch.
 */
export async function getRecipesFromCache(
  limit: number
): Promise<Recipe[]> {
  const db = await getDB();
  const tx = db.transaction(STORE_RECIPES, 'readwrite');
  const store = tx.objectStore(STORE_RECIPES);
  const index = store.index(INDEX_ORDER);
  const all = await index.getAll();
  const sorted = all.sort((a, b) => a.order - b.order);
  const toReturn = sorted.slice(0, limit);
  for (const row of toReturn) {
    await store.delete(row.id);
  }
  await tx.done;
  return toReturn.map((r) => r.recipe);
}

/**
 * Put recipes into cache with order = maxOrder + i. Evict if over MAX_RECIPES (LRU).
 * Does not block: runs in background. Prefetch calls this after API returns.
 */
export async function putRecipesInCache(recipes: Recipe[]): Promise<void> {
  if (recipes.length === 0) return;
  const db = await getDB();
  const tx = db.transaction(STORE_RECIPES, 'readwrite');
  const store = tx.objectStore(STORE_RECIPES);
  const index = store.index(INDEX_ORDER);
  const all = await index.getAll();
  const maxOrder = all.length === 0 ? 0 : Math.max(...all.map((r) => r.order));
  let nextOrder = maxOrder + 1;
  for (const recipe of recipes) {
    await store.put({
      id: recipe.id,
      recipe,
      order: nextOrder++,
    });
  }
  const count = await store.count();
  if (count > MAX_RECIPES) {
    const toEvict = count - MAX_RECIPES;
    const sorted = (await index.getAll()).sort((a, b) => a.order - b.order);
    for (let i = 0; i < toEvict && i < sorted.length; i++) {
      await store.delete(sorted[i]!.id);
    }
  }
  await tx.done;
}

/**
 * Count of recipes currently in cache (for debugging / tests).
 */
export async function getCacheRecipeCount(): Promise<number> {
  const db = await getDB();
  return db.count(STORE_RECIPES);
}

/**
 * Clear cache (e.g. for tests or user action).
 */
export async function clearRecipeCache(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_RECIPES, 'readwrite');
  await tx.objectStore(STORE_RECIPES).clear();
  await tx.done;
}
