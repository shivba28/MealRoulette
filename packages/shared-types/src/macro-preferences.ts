export interface MacroPreferences {
  /** Target protein in grams per meal (single serving) */
  proteinTarget: number;
  /** Target carbs in grams per meal */
  carbsTarget: number;
  /** Target fat in grams per meal */
  fatTarget: number;
  /** Optional calorie cap per meal */
  calorieCap?: number;
  /** Tolerance as fraction (e.g. 0.1 = ±10%) */
  tolerance?: number;
  /** Preferred ingredients (tags); recipes matching any are preferred. */
  preferredIngredients?: string[];
  /** Max cooking time in minutes; recipes over this are filtered out. */
  maxCookTimeMinutes?: number;
}

export const DEFAULT_MACRO_TOLERANCE = 0.15;

/** Default calorie cap when none is set (per meal), aligned with typical daily/3 split. */
export const DEFAULT_CALORIE_CAP_PER_MEAL = 733;
