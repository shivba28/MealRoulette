/**
 * Tests for cache-first fetch and prefetch.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Recipe } from '@mealroulette/shared-types';
import {
  clearRecipeCache,
  putRecipesInCache,
  getCacheRecipeCount,
} from './recipeCache';
import {
  getRecipesWithCache,
  prefetchRecipes,
  type ApiFetchRecipes,
} from './recipeCacheFetch';

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

describe('getRecipesWithCache', () => {
  let apiFetch: ApiFetchRecipes;

  beforeEach(async () => {
    await clearRecipeCache();
    apiFetch = vi.fn().mockResolvedValue([]);
  });

  it('returns from cache when cache has enough', async () => {
    await putRecipesInCache([
      mockRecipe('c1'),
      mockRecipe('c2'),
      mockRecipe('c3'),
    ]);
    const result = await getRecipesWithCache(0, 3, apiFetch);
    expect(result.map((r) => r.id)).toEqual(['c1', 'c2', 'c3']);
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('calls API when cache is empty', async () => {
    const apiRecipes = [mockRecipe('a1'), mockRecipe('a2')];
    apiFetch = vi.fn().mockResolvedValue(apiRecipes);
    const result = await getRecipesWithCache(0, 5, apiFetch);
    expect(result.map((r) => r.id)).toEqual(['a1', 'a2']);
    expect(apiFetch).toHaveBeenCalledWith(0, 5);
    expect(await getCacheRecipeCount()).toBe(2);
  });

  it('merges partial cache with API result', async () => {
    await putRecipesInCache([mockRecipe('c1')]);
    apiFetch = vi.fn().mockResolvedValue([
      mockRecipe('a1'),
      mockRecipe('a2'),
    ]);
    const result = await getRecipesWithCache(0, 3, apiFetch);
    expect(result.map((r) => r.id)).toEqual(['c1', 'a1', 'a2']);
    expect(apiFetch).toHaveBeenCalledWith(0, 3);
  });

  it('returns cached when API fails (offline)', async () => {
    await putRecipesInCache([mockRecipe('c1'), mockRecipe('c2')]);
    apiFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const result = await getRecipesWithCache(0, 5, apiFetch);
    expect(result.map((r) => r.id)).toEqual(['c1', 'c2']);
  });
});

describe('prefetchRecipes', () => {
  beforeEach(async () => {
    await clearRecipeCache();
  });

  it('stores API result in cache without blocking', async () => {
    const apiFetch: ApiFetchRecipes = vi
      .fn()
      .mockResolvedValue([mockRecipe('p1'), mockRecipe('p2')]);
    prefetchRecipes(10, 20, apiFetch);
    await new Promise((r) => setTimeout(r, 50));
    expect(await getCacheRecipeCount()).toBe(2);
  });
});
