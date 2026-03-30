// NOTE: Explicit `.js` extensions are required for Node ESM resolution in production
// (e.g. Render running `node` against `dist/esm`). TypeScript preserves specifiers.
export type { Recipe, RecipeInput, RecipeMacros } from './recipe.js';
export { EXAMPLE_RECIPE } from './recipe.js';
export type { MacroPreferences } from './macro-preferences.js';
export { DEFAULT_MACRO_TOLERANCE, DEFAULT_CALORIE_CAP_PER_MEAL } from './macro-preferences.js';
export type { NutritionInfo } from './nutrition-info.js';
export type { SwipeEvent, SwipeEventInput, SwipeDirection } from './swipe-event.js';
export type { UserProfile, MacroSum } from './user-profile.js';
export { EMPTY_USER_PROFILE } from './user-profile.js';
