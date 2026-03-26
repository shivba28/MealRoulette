import { beforeEach, describe, expect, it, vi } from 'vitest';
import { calculateStreak, getTodayKey } from './streakUtils';

describe('streakUtils', () => {
  describe('getTodayKey', () => {
    it('returns key in format macro-log-YYYY-MM-DD', () => {
      expect(getTodayKey()).toMatch(/^macro-log-\d{4}-\d{2}-\d{2}$/);
    });

    it('returns today date in ISO slice', () => {
      const key = getTodayKey();
      const datePart = key.replace('macro-log-', '');
      const today = new Date().toISOString().slice(0, 10);
      expect(datePart).toBe(today);
    });
  });

  describe('calculateStreak', () => {
    const KEY_PREFIX = 'macro-log-';

    function setupStorage(store: Record<string, string>) {
      const keys = Object.keys(store);
      vi.stubGlobal('localStorage', {
        getItem: (key: string) => store[key] ?? null,
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        key: (i: number) => keys[i] ?? null,
        get length() {
          return keys.length;
        },
      });
    }

    beforeEach(() => {
      vi.unstubAllGlobals();
    });

    it('returns 0 when localStorage has no macro-log keys', () => {
      setupStorage({});
      expect(calculateStreak()).toBe(0);
    });

    it('returns 0 when keys exist but have no meals', () => {
      const today = new Date().toISOString().slice(0, 10);
      setupStorage({
        [KEY_PREFIX + today]: JSON.stringify({ date: today, meals: [] }),
      });
      expect(calculateStreak()).toBe(0);
    });

    it('returns 1 when today has at least one meal', () => {
      const today = new Date().toISOString().slice(0, 10);
      const meal = {
        recipeId: '1',
        recipeName: 'Test',
        protein: 20,
        carbs: 30,
        fat: 10,
        calories: 300,
        loggedAt: new Date().toISOString(),
      };
      setupStorage({
        [KEY_PREFIX + today]: JSON.stringify({ date: today, meals: [meal] }),
      });
      expect(calculateStreak()).toBe(1);
    });

    it('counts consecutive days with meals from today', () => {
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const twoDaysAgoStr = twoDaysAgo.toISOString().slice(0, 10);
      const meal = {
        recipeId: '1',
        recipeName: 'Meal',
        protein: 10,
        carbs: 10,
        fat: 5,
        calories: 150,
        loggedAt: new Date().toISOString(),
      };
      setupStorage({
        [KEY_PREFIX + todayStr]: JSON.stringify({ date: todayStr, meals: [meal] }),
        [KEY_PREFIX + yesterdayStr]: JSON.stringify({ date: yesterdayStr, meals: [meal] }),
        [KEY_PREFIX + twoDaysAgoStr]: JSON.stringify({ date: twoDaysAgoStr, meals: [meal] }),
      });
      expect(calculateStreak()).toBe(3);
    });

    it('stops counting when a day has no meals', () => {
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const twoDaysAgoStr = twoDaysAgo.toISOString().slice(0, 10);
      const meal = {
        recipeId: '1',
        recipeName: 'Meal',
        protein: 10,
        carbs: 10,
        fat: 5,
        calories: 150,
        loggedAt: new Date().toISOString(),
      };
      setupStorage({
        [KEY_PREFIX + todayStr]: JSON.stringify({ date: todayStr, meals: [meal] }),
        [KEY_PREFIX + yesterdayStr]: JSON.stringify({ date: yesterdayStr, meals: [] }),
        [KEY_PREFIX + twoDaysAgoStr]: JSON.stringify({ date: twoDaysAgoStr, meals: [meal] }),
      });
      expect(calculateStreak()).toBe(1);
    });
  });
});
