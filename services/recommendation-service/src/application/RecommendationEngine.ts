import type { MacroPreferences } from '../domain/MacroPreferences';
import { RecipeScore } from '../domain/RecipeScore';
import type { Recipe } from '@mealroulette/shared-types';

/** Weights for macro components (must sum to 1 when all targets are non-zero). */
export interface MacroWeights {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

export const DEFAULT_WEIGHTS: MacroWeights = {
  protein: 0.25,
  carbs: 0.25,
  fat: 0.25,
  calories: 0.25,
};

/** Options for scoring: weights and optional sigmoid penalty for extreme overshoot. */
export interface ScoringOptions {
  weights?: MacroWeights;
  /** Use sigmoid-style penalty for values far from target (default true). */
  useSigmoidPenalty?: boolean;
  /** Steepness of sigmoid decay outside tolerance band (default 2). */
  sigmoidSteepness?: number;
}

const DEFAULT_OPTIONS: Required<ScoringOptions> = {
  weights: DEFAULT_WEIGHTS,
  useSigmoidPenalty: true,
  sigmoidSteepness: 2,
};

/**
 * Normalized match score in [0, 1] for a single macro.
 * - Zero target: returns 1 if value is 0 (no preference met), else 0.
 * - Within tolerance band [1-tol, 1+tol]: linear decay from 1 at ratio=1.
 * - Outside band: linear penalty or sigmoid penalty (configurable).
 * Negative values are clamped to 0.
 */
function normalizedMatch(
  value: number,
  target: number,
  tolerance: number,
  useSigmoid: boolean,
  sigmoidSteepness: number
): number {
  const safeValue = Math.max(0, value);
  if (target <= 0) {
    return safeValue === 0 ? 1 : 0;
  }
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
  const penalty = Math.min(1, overshoot + undershoot);
  return Math.max(0, 1 - penalty);
}

/** Safe number: treat NaN/undefined as 0 for missing recipe macros. */
function safeMacro(n: number): number {
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/**
 * Pure, deterministic scoring: weighted normalized match per macro.
 * Handles zero targets, missing/negative recipe values, and clamps score to [0, 1].
 */
export function scoreRecipe(
  recipe: Recipe,
  preferences: MacroPreferences,
  options: ScoringOptions = {}
): RecipeScore {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const tol = preferences.tolerance;
  const k = opts.sigmoidSteepness;

  const proteinTarget = preferences.proteinTarget / 3;
  const carbsTarget = preferences.carbsTarget / 3;
  const fatTarget = preferences.fatTarget / 3;
  const calorieTarget =
    preferences.calorieCap !== undefined
      ? preferences.calorieCap / 3
      : safeMacro(recipe.calories);

  const proteinMatch = normalizedMatch(
    safeMacro(recipe.protein),
    proteinTarget,
    tol,
    opts.useSigmoidPenalty,
    k
  );
  const carbsMatch = normalizedMatch(
    safeMacro(recipe.carbs),
    carbsTarget,
    tol,
    opts.useSigmoidPenalty,
    k
  );
  const fatMatch = normalizedMatch(
    safeMacro(recipe.fat),
    fatTarget,
    tol,
    opts.useSigmoidPenalty,
    k
  );
  const calorieMatch = normalizedMatch(
    safeMacro(recipe.calories),
    calorieTarget,
    tol,
    opts.useSigmoidPenalty,
    k
  );

  const w = opts.weights;
  let totalWeight = 0;
  let weightedSum = 0;

  if (proteinTarget > 0) {
    totalWeight += w.protein;
    weightedSum += w.protein * proteinMatch;
  }
  if (carbsTarget > 0) {
    totalWeight += w.carbs;
    weightedSum += w.carbs * carbsMatch;
  }
  if (fatTarget > 0) {
    totalWeight += w.fat;
    weightedSum += w.fat * fatMatch;
  }
  if (calorieTarget > 0) {
    totalWeight += w.calories;
    weightedSum += w.calories * calorieMatch;
  }

  const rawScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const score = Math.max(0, Math.min(1, Number.isFinite(rawScore) ? rawScore : 0));

  return RecipeScore.create(recipe.id, score, {
    proteinMatch,
    carbsMatch,
    fatMatch,
    calorieMatch,
  });
}

/**
 * Application service: ranks recipes by preference match.
 * Returns scores sorted descending (best first).
 */
export class RecommendationEngine {
  constructor(private readonly scoringOptions: ScoringOptions = {}) {}

  recommend(
    recipes: Recipe[],
    preferences: MacroPreferences
  ): RecipeScore[] {
    const scores = recipes.map((r) => scoreRecipe(r, preferences, this.scoringOptions));
    scores.sort((a, b) => b.score - a.score);
    return scores;
  }
}
