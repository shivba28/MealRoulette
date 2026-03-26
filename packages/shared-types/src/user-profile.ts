/**
 * Dynamic user profile derived from like/pass patterns.
 * Used to compute userPreferenceMultiplier for personalized scoring and AI context.
 */

export interface MacroSum {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

export interface UserProfile {
  /** Tag -> count of recipes with this tag that the user liked. */
  likedTagCounts: Record<string, number>;
  /** Tag -> count of recipes with this tag that the user passed. */
  passedTagCounts: Record<string, number>;
  /** Sum of macros from liked recipes (divide by likedCount for tendency). */
  likedMacroSum: MacroSum;
  /** Number of liked recipes used to build likedMacroSum. */
  likedCount: number;
  /** Sum of macros from passed recipes. */
  passedMacroSum: MacroSum;
  /** Number of passed recipes used to build passedMacroSum. */
  passedCount: number;
}

export const EMPTY_USER_PROFILE: UserProfile = {
  likedTagCounts: {},
  passedTagCounts: {},
  likedMacroSum: { protein: 0, carbs: 0, fat: 0, calories: 0 },
  likedCount: 0,
  passedMacroSum: { protein: 0, carbs: 0, fat: 0, calories: 0 },
  passedCount: 0,
};
