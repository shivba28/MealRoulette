/**
 * Tests for recipe scoring and recommendRecipes.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { MacroPreferences, Recipe } from '@mealroulette/shared-types';
import { scoreRecipe, recommendRecipes } from './scoreRecipe';

const mockRecipe = (overrides: Partial<Recipe>): Recipe => ({
  id: '1',
  name: 'Test',
  description: 'Desc',
  calories: 300,
  protein: 25,
  carbs: 35,
  fat: 10,
  servings: 1,
  tags: [],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

const prefs: MacroPreferences = {
  proteinTarget: 90,
  carbsTarget: 105,
  fatTarget: 30,
  calorieCap: 900,
  tolerance: 0.15,
};

describe('scoreRecipe', () => {
  it('returns score in [0, 1]', () => {
    const r = mockRecipe({ protein: 30, carbs: 35, fat: 10, calories: 300 });
    const result = scoreRecipe(r, prefs);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
    expect(result.recipeId).toBe(r.id);
  });

  it('higher macro match gives higher score', () => {
    const wellMatched = mockRecipe({
      protein: 30,
      carbs: 35,
      fat: 10,
      calories: 300,
    });
    const poorMatch = mockRecipe({
      protein: 5,
      carbs: 5,
      fat: 2,
      calories: 100,
    });
    const scoreWell = scoreRecipe(wellMatched, prefs).score;
    const scorePoor = scoreRecipe(poorMatch, prefs).score;
    expect(scoreWell).toBeGreaterThan(scorePoor);
  });
});

describe('recommendRecipes', () => {
  it('returns sorted recipes descending by score', () => {
    const recipes = [
      mockRecipe({ id: 'a', protein: 5, carbs: 5, fat: 2 }),
      mockRecipe({ id: 'b', protein: 30, carbs: 35, fat: 10 }),
      mockRecipe({ id: 'c', protein: 25, carbs: 30, fat: 8 }),
    ];
    const result = recommendRecipes(recipes, prefs, new Set(), 3);
    expect(result).toHaveLength(3);
    expect(result[0]!.id).toBe('b');
  });

  it('filters out excluded recipe IDs', () => {
    const recipes = [
      mockRecipe({ id: 'a' }),
      mockRecipe({ id: 'b' }),
      mockRecipe({ id: 'c' }),
    ];
    const result = recommendRecipes(recipes, prefs, new Set(['b']), 3);
    expect(result.map((r) => r.id)).not.toContain('b');
    expect(result.length).toBeLessThanOrEqual(2);
  });
});
