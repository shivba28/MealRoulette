/**
 * Cache-first recipe fetching for offline and fast first paint.
 *
 * Strategy:
 * 1. Try IndexedDB cache first (getRecipesFromCache(limit)).
 * 2. If cache returns >= limit recipes, return them immediately (no network).
 * 3. Otherwise fetch from API(offset, limit), store in cache, return API result.
 *
 * Prefetching: when deck has < 3 cards, caller triggers this with next offset
 * in the background; new recipes are written to cache so next ensureLoaded can
 * drain from cache without blocking UI or reducing FPS.
 */

import {
  getRecipesFromCache,
  putRecipesInCache,
} from './recipeCache';
import type { Recipe } from '@mealroulette/shared-types';

export type ApiFetchRecipes = (
  offset: number,
  limit: number
) => Promise<Recipe[]>;

/**
 * Fetch recipes: cache first, then API. Stores API results in IndexedDB.
 * If cache has partial batch (< limit), we merge cached + API and return up to limit.
 * Offline: if API fails and we have cached recipes, we return them (and do not re-put
 * them; they were already consumed from cache). So deck stays usable offline.
 */
export async function getRecipesWithCache(
  offset: number,
  limit: number,
  apiFetch: ApiFetchRecipes
): Promise<Recipe[]> {
  const cached = await getRecipesFromCache(limit);
  if (cached.length >= limit) {
    return cached;
  }
  try {
    const fromApi = await apiFetch(offset, limit);
    if (fromApi.length > 0) {
      await putRecipesInCache(fromApi);
    }
    return [...cached, ...fromApi].slice(0, limit);
  } catch {
    return cached;
  }
}

/**
 * Prefetch next batch in the background. Does not block; stores in IndexedDB.
 * Call when deck.length < preloadThreshold so next ensureLoaded can use cache.
 */
export function prefetchRecipes(
  offset: number,
  limit: number,
  apiFetch: ApiFetchRecipes
): void {
  apiFetch(offset, limit)
    .then((recipes) => {
      if (recipes.length > 0) {
        return putRecipesInCache(recipes);
      }
      return undefined;
    })
    .catch(() => {});
}
