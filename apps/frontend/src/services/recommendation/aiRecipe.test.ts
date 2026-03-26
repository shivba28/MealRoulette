/**
 * Tests for AI-generated recipe fallback.
 * AI personalization: when user profile is passed, generated recipe uses liked tags and macro tendency.
 */

import { describe, expect, it } from 'vitest';
import type { MacroPreferences, UserProfile } from '@mealroulette/shared-types';
import { EMPTY_USER_PROFILE } from '@mealroulette/shared-types';
import { generateAIRecipe, generateAIRecipesBatch, generateSingleRecipeForRoulette } from './aiRecipe';

const prefs: MacroPreferences = {
  proteinTarget: 90,
  carbsTarget: 200,
  fatTarget: 65,
  calorieCap: 2200,
  tolerance: 0.15,
  preferredIngredients: ['chicken', 'rice'],
  maxCookTimeMinutes: 30,
};

describe('generateAIRecipe', () => {
  it('returns a recipe with macros matching preferences', async () => {
    const recipe = await generateAIRecipe(prefs);
    expect(recipe).not.toBeNull();
    expect(recipe!.id).toMatch(/^ai-/);
    expect(recipe!.name).toBe('AI-suggested meal');
    expect(recipe!.protein).toBe(30);
    expect(recipe!.carbs).toBe(67);
    expect(recipe!.fat).toBe(22);
    expect(recipe!.tags).toContain('chicken');
    expect(recipe!.tags).toContain('rice');
    expect(recipe!.cookTimeMinutes).toBe(30);
  });

  it('returns recipe without optional prefs when not set', async () => {
    const minimal: MacroPreferences = {
      proteinTarget: 60,
      carbsTarget: 100,
      fatTarget: 40,
    };
    const recipe = await generateAIRecipe(minimal);
    expect(recipe).not.toBeNull();
    expect(recipe!.calories).toBeGreaterThan(0);
    expect(recipe!.tags).toContain('balanced');
  });

  it('uses profile liked tags when profile is passed', async () => {
    const profile: UserProfile = {
      ...EMPTY_USER_PROFILE,
      likedTagCounts: { pasta: 5, basil: 3, tomato: 2 },
      likedCount: 10,
    };
    const recipe = await generateAIRecipe(prefs, profile);
    expect(recipe).not.toBeNull();
    expect(recipe!.tags).toContain('pasta');
    expect(recipe!.tags).toContain('basil');
    expect(recipe!.tags).toContain('tomato');
  });

  it('uses profile macro tendency (likedMacroSum / likedCount) when profile has likes', async () => {
    const profile: UserProfile = {
      ...EMPTY_USER_PROFILE,
      likedTagCounts: { balanced: 1 },
      likedMacroSum: { protein: 90, carbs: 120, fat: 30, calories: 900 },
      likedCount: 3,
      passedTagCounts: {},
      passedMacroSum: { protein: 0, carbs: 0, fat: 0, calories: 0 },
      passedCount: 0,
    };
    const recipe = await generateAIRecipe(prefs, profile);
    expect(recipe).not.toBeNull();
    expect(recipe!.protein).toBe(30);
    expect(recipe!.carbs).toBe(40);
    expect(recipe!.fat).toBe(10);
    expect(recipe!.calories).toBe(300);
  });

  it('returns valid Recipe with ingredients, steps, macros, isAiGenerated', async () => {
    const recipe = await generateAIRecipe(prefs);
    expect(recipe).not.toBeNull();
    expect(recipe!.id).toMatch(/^ai-/);
    expect(recipe!.name).toBeDefined();
    expect(Array.isArray(recipe!.ingredients)).toBe(true);
    expect(recipe!.ingredients!.length).toBeGreaterThan(0);
    expect(Array.isArray(recipe!.steps)).toBe(true);
    expect(recipe!.steps!.length).toBeGreaterThan(0);
    expect(recipe!.macros).toEqual({
      calories: recipe!.calories,
      protein: recipe!.protein,
      carbs: recipe!.carbs,
      fat: recipe!.fat,
    });
    expect(recipe!.isAiGenerated).toBe(true);
  });

  it('returns unique recipe per call', async () => {
    const a = await generateAIRecipe(prefs);
    const b = await generateAIRecipe(prefs);
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a!.id).not.toBe(b!.id);
  });
});

describe('generateAIRecipesBatch', () => {
  it('returns 10 recipes with ingredients and steps (mock when no API key)', async () => {
    const prefs: MacroPreferences = {
      proteinTarget: 90,
      carbsTarget: 200,
      fatTarget: 65,
      preferredIngredients: ['chicken'],
    };
    const recipes = await generateAIRecipesBatch(prefs, 10);
    expect(recipes).toHaveLength(10);
    recipes.forEach((r) => {
      expect(r.id).toMatch(/^ai-/);
      expect(r.name).toBeDefined();
      expect(Array.isArray(r.ingredients)).toBe(true);
      expect(r.ingredients!.length).toBeGreaterThan(0);
      expect(Array.isArray(r.steps)).toBe(true);
      expect(r.steps!.length).toBeGreaterThan(0);
      expect(r.isAiGenerated).toBe(true);
    });
  });
});

describe('generateSingleRecipeForRoulette', () => {
  it('returns one recipe with cuisineType (mock when no API key)', async () => {
    const prefs: MacroPreferences = {
      proteinTarget: 90,
      carbsTarget: 200,
      fatTarget: 65,
      preferredIngredients: ['chicken'],
    };
    const recipe = await generateSingleRecipeForRoulette(prefs);
    expect(recipe).not.toBeNull();
    expect(recipe!.id).toMatch(/^ai-/);
    expect(recipe!.name).toBeDefined();
    expect(recipe!.cuisineType).toBeDefined();
    expect(Array.isArray(recipe!.ingredients)).toBe(true);
    expect(Array.isArray(recipe!.steps)).toBe(true);
    expect(recipe!.isAiGenerated).toBe(true);
  });

  it('accepts avoidRecipeNames for prompt', async () => {
    const prefs: MacroPreferences = { proteinTarget: 60, carbsTarget: 100, fatTarget: 40 };
    const recipe = await generateSingleRecipeForRoulette(prefs, ['Grilled Chicken Bowl']);
    expect(recipe).not.toBeNull();
  });
});
