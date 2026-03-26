/**
 * Recipe scoring for personalization (mirrors recommendation-service logic).
 * Uses shared-types MacroPreferences; returns score in [0, 1] and match details.
 */

import type { MacroPreferences, Recipe } from '@mealroulette/shared-types';

export interface RecipeScoreResult {
  recipeId: string;
  score: number;
  matchDetails: {
    proteinMatch: number;
    carbsMatch: number;
    fatMatch: number;
    calorieMatch: number;
  };
}

const TOLERANCE_DEFAULT = 0.15;
const SIGMOID_STEEPNESS = 2;

function normalizedMatch(
  value: number,
  target: number,
  tolerance: number,
  useSigmoid: boolean,
  sigmoidSteepness: number
): number {
  const safeValue = Math.max(0, value);
  if (target <= 0) return safeValue === 0 ? 1 : 0;
  const ratio = safeValue / target;
  const lower = 1 - tolerance;
  const upper = 1 + tolerance;
  if (ratio >= lower && ratio <= upper) {
    const deviation = Math.abs(ratio - 1);
    return Math.max(0, 1 - deviation / tolerance);
  }
  const deviation = Math.abs(ratio - 1);
  if (useSigmoid) {
    const penalty = 1 / (1 + sigmoidSteepness * deviation * deviation);
    return Math.max(0, Math.min(1, penalty));
  }
  const overshoot = ratio > upper ? (ratio - upper) / (2 * tolerance) : 0;
  const undershoot = ratio < lower ? (lower - ratio) / (2 * tolerance) : 0;
  return Math.max(0, 1 - Math.min(1, overshoot + undershoot));
}

function safeMacro(n: number): number {
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/**
 * Weighted score in [0, 1] for a recipe given macro preferences.
 */
export function scoreRecipe(
  recipe: Recipe,
  preferences: MacroPreferences
): RecipeScoreResult {
  const tol = preferences.tolerance ?? TOLERANCE_DEFAULT;
  const proteinTarget = preferences.proteinTarget;
  const carbsTarget = preferences.carbsTarget;
  const fatTarget = preferences.fatTarget;
  const calorieTarget =
    preferences.calorieCap !== undefined
      ? preferences.calorieCap
      : safeMacro(recipe.calories);

  const proteinMatch = normalizedMatch(
    safeMacro(recipe.protein),
    proteinTarget,
    tol,
    true,
    SIGMOID_STEEPNESS
  );
  const carbsMatch = normalizedMatch(
    safeMacro(recipe.carbs),
    carbsTarget,
    tol,
    true,
    SIGMOID_STEEPNESS
  );
  const fatMatch = normalizedMatch(
    safeMacro(recipe.fat),
    fatTarget,
    tol,
    true,
    SIGMOID_STEEPNESS
  );
  const calorieMatch = normalizedMatch(
    safeMacro(recipe.calories),
    calorieTarget,
    tol,
    true,
    SIGMOID_STEEPNESS
  );

  let totalWeight = 0;
  let weightedSum = 0;
  if (proteinTarget > 0) {
    totalWeight += 0.25;
    weightedSum += 0.25 * proteinMatch;
  }
  if (carbsTarget > 0) {
    totalWeight += 0.25;
    weightedSum += 0.25 * carbsMatch;
  }
  if (fatTarget > 0) {
    totalWeight += 0.25;
    weightedSum += 0.25 * fatMatch;
  }
  if (calorieTarget > 0) {
    totalWeight += 0.25;
    weightedSum += 0.25 * calorieMatch;
  }
  const rawScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const score = Math.max(
    0,
    Math.min(1, Number.isFinite(rawScore) ? rawScore : 0)
  );

  return {
    recipeId: recipe.id,
    score,
    matchDetails: { proteinMatch, carbsMatch, fatMatch, calorieMatch },
  };
}

/**
 * Score all recipes, sort descending by score, return top N recipe IDs then map to Recipe[].
 */
export function recommendRecipes(
  recipes: Recipe[],
  preferences: MacroPreferences,
  excludeIds: Set<string>,
  topN: number
): Recipe[] {
  const scored = recipes.map((r) => scoreRecipe(r, preferences));
  scored.sort((a, b) => b.score - a.score);
  const idToRecipe = new Map(recipes.map((r) => [r.id, r]));
  const result: Recipe[] = [];
  for (const s of scored) {
    if (result.length >= topN) break;
    if (excludeIds.has(s.recipeId)) continue;
    const recipe = idToRecipe.get(s.recipeId);
    if (recipe) result.push(recipe);
  }
  return result;
}

/**
 * Sort recipes by score descending (for merging into recommendation pool).
 */
export function sortRecipesByScore(
  recipes: Recipe[],
  preferences: MacroPreferences
): Recipe[] {
  const withScore = recipes.map((r) => ({ recipe: r, score: scoreRecipe(r, preferences).score }));
  withScore.sort((a, b) => b.score - a.score);
  return withScore.map((w) => w.recipe);
}
