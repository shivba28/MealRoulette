/**
 * Tests for IndexedDB user profile cache (offline + reload).
 * Uses fake-indexeddb from test setup.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { UserProfile } from '@mealroulette/shared-types';
import {
  getStoredUserProfile,
  setStoredUserProfile,
  clearStoredUserProfile,
} from './userProfileCache';

const mockProfile: UserProfile = {
  likedTagCounts: { pasta: 2, chicken: 1 },
  passedTagCounts: { fish: 1 },
  likedMacroSum: { protein: 90, carbs: 120, fat: 30, calories: 900 },
  likedCount: 3,
  passedMacroSum: { protein: 20, carbs: 10, fat: 5, calories: 150 },
  passedCount: 1,
};

describe('userProfileCache', () => {
  beforeEach(async () => {
    await clearStoredUserProfile();
  });

  it('returns null when cache is empty', async () => {
    expect(await getStoredUserProfile()).toBeNull();
  });

  it('stores and retrieves profile', async () => {
    await setStoredUserProfile(mockProfile);
    const got = await getStoredUserProfile();
    expect(got).not.toBeNull();
    expect(got!.likedTagCounts).toEqual(mockProfile.likedTagCounts);
    expect(got!.passedTagCounts).toEqual(mockProfile.passedTagCounts);
    expect(got!.likedCount).toBe(3);
    expect(got!.passedCount).toBe(1);
  });

  it('clearStoredUserProfile removes profile', async () => {
    await setStoredUserProfile(mockProfile);
    await clearStoredUserProfile();
    expect(await getStoredUserProfile()).toBeNull();
  });
});
