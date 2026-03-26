import { MacroPreferences } from '../domain/MacroPreferences';
import { RecommendationEngine, scoreRecipe } from './RecommendationEngine';
import type { Recipe } from '@mealroulette/shared-types';

const prefs = new MacroPreferences(150, 200, 65, 2200, 0.15);

const baseRecipe: Recipe = {
  id: '1',
  name: 'Test',
  description: '',
  calories: 700,
  protein: 50,
  carbs: 65,
  fat: 22,
  servings: 1,
  tags: [],
  createdAt: '',
  updatedAt: '',
};

describe('scoreRecipe', () => {
  it('returns score in [0, 1]', () => {
    const score = scoreRecipe(baseRecipe, prefs);
    expect(score.score).toBeGreaterThanOrEqual(0);
    expect(score.score).toBeLessThanOrEqual(1);
  });

  it('returns match details for each macro', () => {
    const score = scoreRecipe(baseRecipe, prefs);
    expect(score.matchDetails.proteinMatch).toBeDefined();
    expect(score.matchDetails.carbsMatch).toBeDefined();
    expect(score.matchDetails.fatMatch).toBeDefined();
    expect(score.matchDetails.calorieMatch).toBeDefined();
  });

  it('scores perfect match near 1', () => {
    const perfect: Recipe = {
      ...baseRecipe,
      id: '2',
      calories: 733,
      protein: 50,
      carbs: 67,
      fat: 22,
    };
    const score = scoreRecipe(perfect, prefs);
    expect(score.score).toBeGreaterThan(0.9);
  });

  it('scores poor match lower', () => {
    const poor: Recipe = {
      ...baseRecipe,
      id: '3',
      calories: 2000,
      protein: 20,
      carbs: 300,
      fat: 80,
    };
    const score = scoreRecipe(poor, prefs);
    expect(score.score).toBeLessThan(0.5);
  });

  describe('zero macro targets', () => {
    it('avoids divide by zero and returns finite scores', () => {
      const zeroPrefs = new MacroPreferences(0, 0, 0, undefined, 0.15);
      const recipe: Recipe = { ...baseRecipe, id: 'z', calories: 0, protein: 0, carbs: 0, fat: 0 };
      const score = scoreRecipe(recipe, zeroPrefs);
      expect(Number.isFinite(score.score)).toBe(true);
      expect(Number.isNaN(score.score)).toBe(false);
      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.score).toBeLessThanOrEqual(1);
    });

    it('scores 0 when recipe has macros but targets are zero', () => {
      const zeroPrefs = new MacroPreferences(0, 0, 0, 0, 0.15);
      const score = scoreRecipe(baseRecipe, zeroPrefs);
      expect(score.score).toBe(0);
    });
  });

  describe('recipe with zero / missing macro values', () => {
    it('returns finite score without NaN when all macros are zero', () => {
      const recipe: Recipe = {
        ...baseRecipe,
        id: 'zero-macro',
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      };
      const score = scoreRecipe(recipe, prefs);
      expect(Number.isFinite(score.score)).toBe(true);
      expect(Number.isNaN(score.score)).toBe(false);
      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.score).toBeLessThanOrEqual(1);
    });

    it('handles partial zero macros (missing-like): only non-zero components contribute', () => {
      const recipe: Recipe = {
        ...baseRecipe,
        id: 'partial-zero',
        calories: 700,
        protein: 0,
        carbs: 65,
        fat: 0,
      };
      const score = scoreRecipe(recipe, prefs);
      expect(Number.isFinite(score.score)).toBe(true);
      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.score).toBeLessThanOrEqual(1);
    });
  });

  describe('negative macro values', () => {
    it('clamps negative recipe values and returns valid score', () => {
      const recipe: Recipe = {
        ...baseRecipe,
        id: 'neg',
        calories: -100,
        protein: -10,
        carbs: -20,
        fat: -5,
      };
      const score = scoreRecipe(recipe, prefs);
      expect(Number.isFinite(score.score)).toBe(true);
      expect(Number.isNaN(score.score)).toBe(false);
      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.score).toBeLessThanOrEqual(1);
    });
  });

  describe('deterministic scoring', () => {
    it('returns identical score for same input twice', () => {
      const a = scoreRecipe(baseRecipe, prefs);
      const b = scoreRecipe(baseRecipe, prefs);
      expect(a.score).toBe(b.score);
      expect(a.matchDetails.proteinMatch).toBe(b.matchDetails.proteinMatch);
      expect(a.matchDetails.carbsMatch).toBe(b.matchDetails.carbsMatch);
      expect(a.matchDetails.fatMatch).toBe(b.matchDetails.fatMatch);
      expect(a.matchDetails.calorieMatch).toBe(b.matchDetails.calorieMatch);
    });
  });

  describe('extreme calorie mismatch', () => {
    it('returns lower score for very high calorie recipe than for well-matched recipe', () => {
      const highCal: Recipe = {
        ...baseRecipe,
        id: 'high-cal',
        calories: 10000,
        protein: 50,
        carbs: 65,
        fat: 22,
      };
      const wellMatched: Recipe = {
        ...baseRecipe,
        id: 'well',
        calories: 733,
        protein: 50,
        carbs: 67,
        fat: 22,
      };
      const scoreHigh = scoreRecipe(highCal, prefs);
      const scoreWell = scoreRecipe(wellMatched, prefs);
      expect(Number.isFinite(scoreHigh.score)).toBe(true);
      expect(scoreHigh.score).toBeLessThan(scoreWell.score);
      expect(scoreHigh.matchDetails.calorieMatch).toBeLessThan(0.5);
    });

    it('returns low score for very low calorie recipe when cap is set', () => {
      const lowCal: Recipe = {
        ...baseRecipe,
        id: 'low-cal',
        calories: 10,
        protein: 1,
        carbs: 1,
        fat: 0,
      };
      const score = scoreRecipe(lowCal, prefs);
      expect(score.score).toBeLessThan(0.5);
      expect(Number.isFinite(score.score)).toBe(true);
    });

    it('extreme overages: all macros far over target yield very low score', () => {
      const extreme: Recipe = {
        ...baseRecipe,
        id: 'extreme',
        calories: 5000,
        protein: 500,
        carbs: 600,
        fat: 200,
      };
      const score = scoreRecipe(extreme, prefs);
      expect(score.score).toBeLessThan(0.2);
      expect(Number.isFinite(score.score)).toBe(true);
      expect(score.matchDetails.proteinMatch).toBeLessThan(0.3);
      expect(score.matchDetails.calorieMatch).toBeLessThan(0.3);
    });
  });
});

describe('RecommendationEngine.recommend', () => {
  const engine = new RecommendationEngine();

  it('returns recipes sorted descending by score', () => {
    const recipes: Recipe[] = [
      { ...baseRecipe, id: 'a', calories: 2000, protein: 10, carbs: 300, fat: 80 },
      { ...baseRecipe, id: 'b', calories: 733, protein: 50, carbs: 67, fat: 22 },
      { ...baseRecipe, id: 'c', calories: 500, protein: 40, carbs: 50, fat: 20 },
    ];
    const result = engine.recommend(recipes, prefs);
    expect(result).toHaveLength(3);
    expect(result[0]!.score).toBeGreaterThanOrEqual(result[1]!.score);
    expect(result[1]!.score).toBeGreaterThanOrEqual(result[2]!.score);
    expect(result[0]!.recipeId).toBe('b');
  });

  it('ranking order: best match first, worst last', () => {
    const best: Recipe = { ...baseRecipe, id: 'best', calories: 733, protein: 50, carbs: 67, fat: 22 };
    const worst: Recipe = { ...baseRecipe, id: 'worst', calories: 5000, protein: 5, carbs: 500, fat: 100 };
    const mid: Recipe = { ...baseRecipe, id: 'mid', calories: 800, protein: 40, carbs: 80, fat: 25 };
    const result = engine.recommend([worst, mid, best], prefs);
    expect(result[0]!.recipeId).toBe('best');
    expect(result[1]!.recipeId).toBe('mid');
    expect(result[2]!.recipeId).toBe('worst');
    expect(result[0]!.score).toBeGreaterThan(result[1]!.score);
    expect(result[1]!.score).toBeGreaterThan(result[2]!.score);
  });

  it('returns empty array when given no recipes', () => {
    const result = engine.recommend([], prefs);
    expect(result).toEqual([]);
  });
});
