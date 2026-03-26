export interface MacroPreferences {
  /** Target protein in grams per day */
  proteinTarget: number;
  /** Target carbs in grams per day */
  carbsTarget: number;
  /** Target fat in grams per day */
  fatTarget: number;
  /** Optional calorie cap per day */
  calorieCap?: number;
  /** Tolerance as fraction (e.g. 0.1 = ±10%) */
  tolerance?: number;
  /** Preferred ingredients (tags); recipes matching any are preferred. */
  preferredIngredients?: string[];
  /** Max cooking time in minutes; recipes over this are filtered out. */
  maxCookTimeMinutes?: number;
}

export const DEFAULT_MACRO_TOLERANCE = 0.15;
