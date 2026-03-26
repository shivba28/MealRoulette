/**
 * Tests for user profile store: updateFromSwipe updates tag counts and macro sums,
 * persist/load from IndexedDB, reset clears state. Offline: profile loaded from cache.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { Recipe } from '@mealroulette/shared-types';
import { useUserProfileStore } from './userProfileStore';
import { clearStoredUserProfile } from '@/services/cache';

const mockRecipe = (overrides: Partial<Recipe>): Recipe =>
  ({
    id: '1',
    name: 'Test',
    description: 'Desc',
    calories: 300,
    protein: 30,
    carbs: 35,
    fat: 10,
    servings: 1,
    tags: ['pasta', 'chicken'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  }) as Recipe;

describe('userProfileStore', () => {
  beforeEach(async () => {
    useUserProfileStore.getState().reset();
    await clearStoredUserProfile();
  });

  it('updateFromSwipe(recipe, right) updates likedTagCounts and likedMacroSum', () => {
    const recipe = mockRecipe({ tags: ['pasta', 'chicken'], protein: 30, carbs: 35, fat: 10, calories: 300 });
    useUserProfileStore.getState().updateFromSwipe(recipe, 'right');
    const state = useUserProfileStore.getState();
    expect(state.likedCount).toBe(1);
    expect(state.likedTagCounts['pasta']).toBe(1);
    expect(state.likedTagCounts['chicken']).toBe(1);
    expect(state.likedMacroSum.protein).toBe(30);
    expect(state.likedMacroSum.calories).toBe(300);
  });

  it('updateFromSwipe(recipe, left) updates passedTagCounts and passedMacroSum', () => {
    const recipe = mockRecipe({ tags: ['fish'], protein: 20, carbs: 10, fat: 5, calories: 150 });
    useUserProfileStore.getState().updateFromSwipe(recipe, 'left');
    const state = useUserProfileStore.getState();
    expect(state.passedCount).toBe(1);
    expect(state.passedTagCounts['fish']).toBe(1);
    expect(state.passedMacroSum.protein).toBe(20);
    expect(state.passedMacroSum.calories).toBe(150);
  });

  it('multiple swipes aggregate tag counts', () => {
    const r1 = mockRecipe({ tags: ['pasta'] });
    const r2 = mockRecipe({ id: '2', tags: ['pasta', 'chicken'] });
    useUserProfileStore.getState().updateFromSwipe(r1, 'right');
    useUserProfileStore.getState().updateFromSwipe(r2, 'right');
    const state = useUserProfileStore.getState();
    expect(state.likedCount).toBe(2);
    expect(state.likedTagCounts['pasta']).toBe(2);
    expect(state.likedTagCounts['chicken']).toBe(1);
  });

  it('reset clears all profile state', () => {
    useUserProfileStore.getState().updateFromSwipe(mockRecipe({ tags: ['pasta'] }), 'right');
    useUserProfileStore.getState().reset();
    const state = useUserProfileStore.getState();
    expect(state.likedCount).toBe(0);
    expect(state.passedCount).toBe(0);
    expect(Object.keys(state.likedTagCounts)).toHaveLength(0);
    expect(Object.keys(state.passedTagCounts)).toHaveLength(0);
  });

  it('persistToStorage and loadFromStorage round-trip profile', async () => {
    useUserProfileStore.getState().updateFromSwipe(mockRecipe({ tags: ['pasta'], protein: 25 }), 'right');
    await useUserProfileStore.getState().persistToStorage();
    useUserProfileStore.getState().reset();
    await useUserProfileStore.getState().loadFromStorage();
    const state = useUserProfileStore.getState();
    expect(state.likedCount).toBe(1);
    expect(state.likedTagCounts['pasta']).toBe(1);
    expect(state.likedMacroSum.protein).toBe(25);
  });

  it('stress: 10k swipes aggregate profile correctly', () => {
    const tag = 'stress';
    for (let i = 0; i < 5000; i++) {
      useUserProfileStore.getState().updateFromSwipe(
        mockRecipe({ id: `r-${i}`, tags: [tag], protein: 20, carbs: 30, fat: 10, calories: 250 }),
        'right'
      );
    }
    for (let i = 0; i < 5000; i++) {
      useUserProfileStore.getState().updateFromSwipe(
        mockRecipe({ id: `p-${i}`, tags: ['other'], protein: 15, carbs: 20, fat: 8, calories: 200 }),
        'left'
      );
    }
    const state = useUserProfileStore.getState();
    expect(state.likedCount).toBe(5000);
    expect(state.passedCount).toBe(5000);
    expect(state.likedTagCounts[tag]).toBe(5000);
    expect(state.passedTagCounts['other']).toBe(5000);
    expect(state.likedMacroSum.protein).toBe(5000 * 20);
    expect(state.passedMacroSum.calories).toBe(5000 * 200);
  });
});
