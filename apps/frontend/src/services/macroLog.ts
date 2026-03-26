/**
 * Daily macro log: store consumed macros per day in localStorage.
 * Key: 'macro-log-YYYY-MM-DD'
 */

import { getTodayKey } from '@/utils/streakUtils';

export interface LoggedMeal {
  recipeId: string;
  recipeName: string;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
  loggedAt: string;
}

export interface DailyMacroLog {
  date: string;
  meals: LoggedMeal[];
}

export function getTodayMacroLog(): DailyMacroLog {
  const date = new Date().toISOString().slice(0, 10);
  const key = getTodayKey();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { date, meals: [] };
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as DailyMacroLog).meals)) {
      return { date, meals: [] };
    }
    const data = parsed as DailyMacroLog;
    return {
      date: data.date ?? date,
      meals: data.meals.filter(
        (m): m is LoggedMeal =>
          m != null &&
          typeof m === 'object' &&
          typeof (m as LoggedMeal).recipeId === 'string' &&
          typeof (m as LoggedMeal).recipeName === 'string' &&
          typeof (m as LoggedMeal).protein === 'number' &&
          typeof (m as LoggedMeal).carbs === 'number' &&
          typeof (m as LoggedMeal).fat === 'number' &&
          typeof (m as LoggedMeal).calories === 'number' &&
          typeof (m as LoggedMeal).loggedAt === 'string'
      ),
    };
  } catch {
    return { date, meals: [] };
  }
}

export function appendMealToToday(meal: LoggedMeal): void {
  const date = new Date().toISOString().slice(0, 10);
  const key = getTodayKey();
  const current = getTodayMacroLog();
  if (current.date !== date) {
    // New day: start fresh for today (old key remains in localStorage)
    const fresh: DailyMacroLog = { date, meals: [meal] };
    try {
      localStorage.setItem(key, JSON.stringify(fresh));
    } catch {
      // ignore
    }
    return;
  }
  current.meals.unshift(meal);
  try {
    localStorage.setItem(key, JSON.stringify(current));
  } catch {
    // ignore
  }
}

/**
 * Get all macro-log keys sorted by date descending.
 */
export function getAllMacroLogKeys(): string[] {
  if (typeof localStorage === 'undefined') return [];
  const prefix = 'macro-log-';
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix) && key.length === prefix.length + 10) {
      keys.push(key);
    }
  }
  keys.sort((a, b) => b.localeCompare(a));
  return keys;
}

/**
 * Get a single day's log by key.
 */
export function getMacroLogByKey(key: string): DailyMacroLog | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const data = parsed as DailyMacroLog;
    const date = key.replace('macro-log-', '');
    return {
      date: data.date ?? date,
      meals: Array.isArray(data.meals) ? data.meals : [],
    };
  } catch {
    return null;
  }
}
