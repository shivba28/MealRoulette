import { create } from 'zustand';
import type { MacroPreferences } from '@mealroulette/shared-types';
import { DEFAULT_CALORIE_CAP_PER_MEAL } from '@mealroulette/shared-types';
import {
  getStoredPreferences,
  setStoredPreferences,
} from '@/services/cache/preferencesCache';

export interface MacroPreferenceState extends MacroPreferences {
  setProteinTarget: (value: number) => void;
  setCarbsTarget: (value: number) => void;
  setFatTarget: (value: number) => void;
  setCalorieCap: (value: number | undefined) => void;
  setTolerance: (value: number) => void;
  setPreferredIngredients: (value: string[]) => void;
  setMaxCookTimeMinutes: (value: number) => void;
  setTrackerTargetMode: (value: 'perMeal' | 'daily') => void;
  setTrackerMealsPerDay: (value: number) => void;
  setDailyProteinTarget: (value: number) => void;
  setDailyCarbsTarget: (value: number) => void;
  setDailyFatTarget: (value: number) => void;
  setDailyCalorieTarget: (value: number) => void;
  setPreferences: (prefs: Partial<MacroPreferences>) => void;
  reset: () => void;
  /** Load from IndexedDB (call on app init). */
  loadFromStorage: () => Promise<void>;
  /** Persist current state to IndexedDB. */
  persistToStorage: () => Promise<void>;
}

const defaultPreferences: MacroPreferences = {
  proteinTarget: 50,
  carbsTarget: 65,
  fatTarget: 22,
  calorieCap: DEFAULT_CALORIE_CAP_PER_MEAL,
  tolerance: 0.15,
  preferredIngredients: [],
  trackerTargetMode: 'perMeal',
  trackerMealsPerDay: 3,
};

export const useMacroPreferenceStore = create<MacroPreferenceState>((set, get) => ({
  ...defaultPreferences,
  setProteinTarget: (proteinTarget) => set({ proteinTarget }),
  setCarbsTarget: (carbsTarget) => set({ carbsTarget }),
  setFatTarget: (fatTarget) => set({ fatTarget }),
  setCalorieCap: (calorieCap) =>
    set((s) => {
      if (calorieCap === undefined) {
        const { calorieCap: _removed, ...rest } = s;
        return rest as Partial<MacroPreferenceState>;
      }
      return { calorieCap };
    }),
  setTolerance: (tolerance) => set({ tolerance }),
  setPreferredIngredients: (preferredIngredients) => set({ preferredIngredients }),
  setMaxCookTimeMinutes: (maxCookTimeMinutes) => set({ maxCookTimeMinutes }),
  setTrackerTargetMode: (trackerTargetMode) => set({ trackerTargetMode }),
  setTrackerMealsPerDay: (trackerMealsPerDay) =>
    set({ trackerMealsPerDay: Math.max(1, Math.min(8, Math.round(trackerMealsPerDay))) }),
  setDailyProteinTarget: (dailyProteinTarget) => set({ dailyProteinTarget }),
  setDailyCarbsTarget: (dailyCarbsTarget) => set({ dailyCarbsTarget }),
  setDailyFatTarget: (dailyFatTarget) => set({ dailyFatTarget }),
  setDailyCalorieTarget: (dailyCalorieTarget) => set({ dailyCalorieTarget }),
  setPreferences: (prefs) => set((state) => ({ ...state, ...prefs })),
  reset: () => set(defaultPreferences),
  loadFromStorage: async () => {
    const stored = await getStoredPreferences();
    if (stored) set({ ...defaultPreferences, ...stored });
  },
  persistToStorage: async () => {
    const state = get();
    const prefs: MacroPreferences = {
      proteinTarget: state.proteinTarget,
      carbsTarget: state.carbsTarget,
      fatTarget: state.fatTarget,
      tolerance: state.tolerance ?? 0.15,
      preferredIngredients: state.preferredIngredients ?? [],
    };
    if (state.calorieCap !== undefined) prefs.calorieCap = state.calorieCap;
    if (state.maxCookTimeMinutes != null && state.maxCookTimeMinutes !== 60)
      prefs.maxCookTimeMinutes = state.maxCookTimeMinutes;
    if (state.trackerTargetMode) prefs.trackerTargetMode = state.trackerTargetMode;
    if (state.trackerMealsPerDay != null) prefs.trackerMealsPerDay = state.trackerMealsPerDay;
    if (state.dailyProteinTarget != null) prefs.dailyProteinTarget = state.dailyProteinTarget;
    if (state.dailyCarbsTarget != null) prefs.dailyCarbsTarget = state.dailyCarbsTarget;
    if (state.dailyFatTarget != null) prefs.dailyFatTarget = state.dailyFatTarget;
    if (state.dailyCalorieTarget != null) prefs.dailyCalorieTarget = state.dailyCalorieTarget;
    await setStoredPreferences(prefs);
  },
}));
