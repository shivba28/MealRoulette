/**
 * LLM-first recommendation: meals are generated from user preferences via a free LLM
 * (Groq or Hugging Face), not from static API data.
 *
 * Flow:
 * 1. User sets preferences (protein, carbs, fat, calories, cook time, preferred ingredients).
 * 2. Deck requests recipes → we call generateAIRecipesBatch(prefs, 10) to get 10 meals with
 *    ingredients and steps; display as cards.
 * 3. When the user swipes through and cards run low, we request more → LLM is prompted again
 *    for 10 more recipes with the same preferences; results are merged and shown.
 *
 * Preferences are structured into a single prompt; the LLM returns 10 recipes (name, ingredients,
 * steps, macros). No static GraphQL recipes are used for the main deck.
 */

import type { MacroPreferences, Recipe } from '@mealroulette/shared-types';
import { getRecipesFromCache, putRecipesInCache } from '@/services/cache';
import { useMacroPreferenceStore } from '@/state/macroPreferenceStore';
import { useSwipeStore } from '@/state/swipeStore';
import { useUserProfileStore } from '@/state/userProfileStore';
import { generateAIRecipesBatch } from './aiRecipe';

const BATCH_SIZE = 10;
const MAX_POOL_SIZE = 100;

/** Module-level pool of LLM-generated recipes (filled in batches of 10). */
let recommendationPool: Recipe[] = [];

function getPrefs(): MacroPreferences {
  const s = useMacroPreferenceStore.getState();
  const prefs: MacroPreferences = {
    proteinTarget: s.proteinTarget,
    carbsTarget: s.carbsTarget,
    fatTarget: s.fatTarget,
    tolerance: s.tolerance ?? 0.15,
    preferredIngredients: s.preferredIngredients ?? [],
  };
  if (s.calorieCap !== undefined) prefs.calorieCap = s.calorieCap;
  if (s.maxCookTimeMinutes != null && s.maxCookTimeMinutes !== 60)
    prefs.maxCookTimeMinutes = s.maxCookTimeMinutes;
  return prefs;
}

function getSwipedIds(): Set<string> {
  const history = useSwipeStore.getState().swipeHistory;
  return new Set(history.map((r) => r.recipeId));
}

/**
 * Ensure the recommendation pool has at least targetLength recipes by calling the LLM
 * in batches of 10. Each batch is cached in IndexedDB for offline.
 */
async function ensurePool(targetLength: number): Promise<void> {
  const prefs = getPrefs();
  const profile = useUserProfileStore.getState();

  while (recommendationPool.length < targetLength && recommendationPool.length < MAX_POOL_SIZE) {
    const batch = await generateAIRecipesBatch(prefs, BATCH_SIZE, profile);
    if (batch.length === 0) break;
    const existingIds = new Set(recommendationPool.map((r) => r.id));
    for (const r of batch) {
      if (!existingIds.has(r.id)) {
        existingIds.add(r.id);
        recommendationPool.push(r);
      }
    }
    await putRecipesInCache(batch);
  }
}

/**
 * Reset pool (call when user updates preferences so the next fetch gets fresh LLM recommendations).
 */
export function resetRecommendationPool(): void {
  recommendationPool = [];
}

/**
 * Fetch recommended recipes for the deck. LLM-first: pool is filled via generateAIRecipesBatch.
 * When cards run out, the next call triggers another batch of 10 from the LLM with same preferences.
 */
export async function getRecommendedRecipes(
  offset: number,
  limit: number
): Promise<Recipe[]> {
  const prefs = getPrefs();
  const swipedIds = getSwipedIds();
  await ensurePool(offset + limit);

  const poolWithoutSwiped = recommendationPool.filter((r) => !swipedIds.has(r.id));
  let list = poolWithoutSwiped.slice(offset, offset + limit);

  /* If pool is still short (e.g. after filters), pull from IndexedDB cache (prefetched batches). */
  if (list.length < limit) {
    const fromCache = await getRecipesFromCache(limit - list.length);
    const cacheFiltered = fromCache.filter((r) => !swipedIds.has(r.id));
    const seen = new Set(list.map((r) => r.id));
    for (const r of cacheFiltered) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        list.push(r);
        if (list.length >= limit) break;
      }
    }
    list = list.slice(0, limit);
  }

  /* If still short, request one more batch from LLM and append. */
  if (list.length < limit && recommendationPool.length < MAX_POOL_SIZE) {
    const profile = useUserProfileStore.getState();
    const batch = await generateAIRecipesBatch(prefs, BATCH_SIZE, profile);
    const seen = new Set(list.map((r) => r.id));
    for (const r of batch) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        recommendationPool.push(r);
        list.push(r);
        if (list.length >= limit) break;
      }
    }
    if (batch.length > 0) await putRecipesInCache(batch);
    list = list.slice(0, limit);
  }

  return list;
}

/**
 * Returns a fetch function and reset for the deck. Use with RecipeCardDeck fetchRecipes.
 */
export function createRecommendationFetch(): {
  fetchRecipes: (offset: number, limit: number) => Promise<Recipe[]>;
  reset: () => void;
} {
  return {
    fetchRecipes: getRecommendedRecipes,
    reset: resetRecommendationPool,
  };
}
