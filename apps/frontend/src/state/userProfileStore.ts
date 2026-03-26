/**
 * Dynamic user profile derived from like/pass patterns.
 * Updated on each swipe; persisted to IndexedDB for offline and reload.
 * Used by RecommendationEngine for userPreferenceMultiplier (boost/penalize).
 */

import { create } from 'zustand';
import type { Recipe, UserProfile } from '@mealroulette/shared-types';

/** Mirror of shared-types EMPTY_USER_PROFILE (avoids CJS named-export issue in Vite production build). */
const EMPTY_USER_PROFILE: UserProfile = {
  likedTagCounts: {},
  passedTagCounts: {},
  likedMacroSum: { protein: 0, carbs: 0, fat: 0, calories: 0 },
  likedCount: 0,
  passedMacroSum: { protein: 0, carbs: 0, fat: 0, calories: 0 },
  passedCount: 0,
};
import {
  getStoredUserProfile,
  setStoredUserProfile,
} from '@/services/cache/userProfileCache';

export interface UserProfileState extends UserProfile {
  /** Update profile from a swipe (like or pass). Call from deck handleSwipe. */
  updateFromSwipe: (recipe: Recipe, direction: 'left' | 'right') => void;
  /** Load profile from IndexedDB (call on app init). */
  loadFromStorage: () => Promise<void>;
  /** Persist current profile to IndexedDB (call after updateFromSwipe or debounced). */
  persistToStorage: () => Promise<void>;
  /** Reset profile (e.g. for testing). */
  reset: () => void;
}

function addMacroSum(
  sum: UserProfile['likedMacroSum'],
  recipe: Recipe
): UserProfile['likedMacroSum'] {
  return {
    protein: sum.protein + (recipe.protein ?? 0),
    carbs: sum.carbs + (recipe.carbs ?? 0),
    fat: sum.fat + (recipe.fat ?? 0),
    calories: sum.calories + (recipe.calories ?? 0),
  };
}

function addTagCounts(
  counts: Record<string, number>,
  tags: string[]
): Record<string, number> {
  const next = { ...counts };
  for (const tag of tags) {
    const t = tag.trim().toLowerCase();
    if (!t) continue;
    next[t] = (next[t] ?? 0) + 1;
  }
  return next;
}

export const useUserProfileStore = create<UserProfileState>((set, get) => ({
  ...EMPTY_USER_PROFILE,
  updateFromSwipe: (recipe, direction) => {
    set((state) => {
      const tags = recipe.tags ?? [];
      if (direction === 'right') {
        return {
          likedTagCounts: addTagCounts(state.likedTagCounts, tags),
          likedMacroSum: addMacroSum(state.likedMacroSum, recipe),
          likedCount: state.likedCount + 1,
        };
      }
      return {
        passedTagCounts: addTagCounts(state.passedTagCounts, tags),
        passedMacroSum: addMacroSum(state.passedMacroSum, recipe),
        passedCount: state.passedCount + 1,
      };
    });
    void get().persistToStorage();
  },
  loadFromStorage: async () => {
    const stored = await getStoredUserProfile();
    if (stored) set({ ...EMPTY_USER_PROFILE, ...stored });
  },
  persistToStorage: async () => {
    const state = get();
    const profile: UserProfile = {
      likedTagCounts: state.likedTagCounts,
      passedTagCounts: state.passedTagCounts,
      likedMacroSum: state.likedMacroSum,
      likedCount: state.likedCount,
      passedMacroSum: state.passedMacroSum,
      passedCount: state.passedCount,
    };
    await setStoredUserProfile(profile);
  },
  reset: () => set({ ...EMPTY_USER_PROFILE }),
}));
