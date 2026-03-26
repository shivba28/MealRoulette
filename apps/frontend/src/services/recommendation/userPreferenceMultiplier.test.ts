/**
 * Tests for userPreferenceMultiplier: boost recipes aligned with user taste,
 * penalize recipes frequently rejected. Final score = baseScore * multiplier.
 */

import { describe, expect, it } from 'vitest';
import type { Recipe, UserProfile } from '@mealroulette/shared-types';
import { EMPTY_USER_PROFILE } from '@mealroulette/shared-types';
import { userPreferenceMultiplier } from './userPreferenceMultiplier';

function mockRecipe(tags: string[]): Recipe {
  return {
    id: '1',
    name: 'Test',
    description: 'Desc',
    calories: 300,
    protein: 25,
    carbs: 35,
    fat: 10,
    servings: 1,
    tags,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  } as Recipe;
}

describe('userPreferenceMultiplier', () => {
  it('returns 1 for empty profile (no boost or penalty)', () => {
    const recipe = mockRecipe(['pasta', 'chicken']);
    expect(userPreferenceMultiplier(recipe, EMPTY_USER_PROFILE)).toBe(1);
  });

  it('returns 1 for recipe with no tags', () => {
    const recipe = mockRecipe([]);
    const profile: UserProfile = {
      ...EMPTY_USER_PROFILE,
      likedTagCounts: { pasta: 5 },
      likedCount: 5,
    };
    expect(userPreferenceMultiplier(recipe, profile)).toBe(1);
  });

  it('boosts recipe when tags match liked tags', () => {
    const recipe = mockRecipe(['pasta', 'chicken']);
    const profile: UserProfile = {
      ...EMPTY_USER_PROFILE,
      likedTagCounts: { pasta: 3, chicken: 2 },
      likedCount: 5,
    };
    const mult = userPreferenceMultiplier(recipe, profile);
    expect(mult).toBeGreaterThan(1);
    expect(mult).toBeLessThanOrEqual(1.5);
  });

  it('penalizes recipe when tags match passed tags', () => {
    const recipe = mockRecipe(['fish', 'broccoli']);
    const profile: UserProfile = {
      ...EMPTY_USER_PROFILE,
      passedTagCounts: { fish: 4, broccoli: 2 },
      passedCount: 6,
    };
    const mult = userPreferenceMultiplier(recipe, profile);
    expect(mult).toBeLessThan(1);
    expect(mult).toBeGreaterThanOrEqual(0.2);
  });

  it('multiplier is clamped to [0.2, 1.5]', () => {
    const recipe = mockRecipe(['loved']);
    const profile: UserProfile = {
      ...EMPTY_USER_PROFILE,
      likedTagCounts: { loved: 100 },
      likedCount: 100,
    };
    const mult = userPreferenceMultiplier(recipe, profile);
    expect(mult).toBeLessThanOrEqual(1.5);
    const recipePassed = mockRecipe(['hated']);
    const profilePassed: UserProfile = {
      ...EMPTY_USER_PROFILE,
      passedTagCounts: { hated: 100 },
      passedCount: 100,
    };
    const multPassed = userPreferenceMultiplier(recipePassed, profilePassed);
    expect(multPassed).toBeGreaterThanOrEqual(0.2);
  });
});
