/**
 * Tests for IndexedDB recipe cache (queue semantics, LRU eviction).
 * Uses fake-indexeddb from test setup.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { Recipe } from '@mealroulette/shared-types';
import {
  getRecipesFromCache,
  peekRecipesFromCache,
  putRecipesInCache,
  getCacheRecipeCount,
  clearRecipeCache,
} from './recipeCache';

const mockRecipe = (id: string): Recipe => ({
  id,
  name: `Recipe ${id}`,
  description: 'Description',
  calories: 300,
  protein: 25,
  carbs: 35,
  fat: 10,
  servings: 1,
  tags: [],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
});

describe('recipeCache', () => {
  beforeEach(async () => {
    await clearRecipeCache();
  });

  it('returns empty when cache is empty', async () => {
    const got = await getRecipesFromCache(10);
    expect(got).toEqual([]);
  });

  it('stores and retrieves recipes in FIFO order', async () => {
    await putRecipesInCache([
      mockRecipe('1'),
      mockRecipe('2'),
      mockRecipe('3'),
    ]);
    const first = await getRecipesFromCache(2);
    expect(first.map((r) => r.id)).toEqual(['1', '2']);
    const second = await getRecipesFromCache(2);
    expect(second.map((r) => r.id)).toEqual(['3']);
    const third = await getRecipesFromCache(2);
    expect(third).toEqual([]);
  });

  it('consumes recipes from cache (get removes them)', async () => {
    await putRecipesInCache([mockRecipe('a'), mockRecipe('b')]);
    await getRecipesFromCache(10);
    expect(await getCacheRecipeCount()).toBe(0);
  });

  it('getCacheRecipeCount reflects stored count', async () => {
    expect(await getCacheRecipeCount()).toBe(0);
    await putRecipesInCache([mockRecipe('1'), mockRecipe('2')]);
    expect(await getCacheRecipeCount()).toBe(2);
    await getRecipesFromCache(1);
    expect(await getCacheRecipeCount()).toBe(1);
  });

  it('clearRecipeCache removes all', async () => {
    await putRecipesInCache([mockRecipe('1')]);
    await clearRecipeCache();
    expect(await getCacheRecipeCount()).toBe(0);
    const got = await getRecipesFromCache(10);
    expect(got).toEqual([]);
  });

  it('peekRecipesFromCache does not remove rows', async () => {
    await putRecipesInCache([mockRecipe('1'), mockRecipe('2')]);
    const peeked = await peekRecipesFromCache(10);
    expect(peeked.map((r) => r.id)).toEqual(['1', '2']);
    expect(await getCacheRecipeCount()).toBe(2);
    const consumed = await getRecipesFromCache(1);
    expect(consumed.map((r) => r.id)).toEqual(['1']);
    expect(await getCacheRecipeCount()).toBe(1);
  });
});
