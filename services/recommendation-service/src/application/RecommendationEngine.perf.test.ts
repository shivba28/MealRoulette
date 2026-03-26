import { MacroPreferences } from '../domain/MacroPreferences';
import { RecommendationEngine } from './RecommendationEngine';
import type { Recipe } from '@mealroulette/shared-types';

const prefs = new MacroPreferences(150, 200, 65, 2200, 0.15);

function generateRecipes(n: number): Recipe[] {
  const recipes: Recipe[] = [];
  for (let i = 0; i < n; i++) {
    recipes.push({
      id: `recipe-${i}`,
      name: `Recipe ${i}`,
      description: '',
      calories: 300 + (i % 800),
      protein: 20 + (i % 60),
      carbs: 30 + (i % 80),
      fat: 8 + (i % 25),
      servings: 1,
      tags: [],
      createdAt: '',
      updatedAt: '',
    });
  }
  return recipes;
}

describe('RecommendationEngine performance', () => {
  const engine = new RecommendationEngine();

  it('recommend() returns scores sorted descending by score', () => {
    const recipes = generateRecipes(100);
    const result = engine.recommend(recipes, prefs);
    expect(result).toHaveLength(100);
    for (let i = 1; i < result.length; i++) {
      expect(result[i]!.score).toBeLessThanOrEqual(result[i - 1]!.score);
    }
  });

  const PERF_THRESHOLD_MS = 2000;

  it(`recommend(10k recipes) completes within ${PERF_THRESHOLD_MS}ms`, () => {
    const recipes = generateRecipes(10_000);
    const start = performance.now();
    const result = engine.recommend(recipes, prefs);
    const elapsed = performance.now() - start;
    expect(result).toHaveLength(10_000);
    expect(result[0]!.score).toBeGreaterThanOrEqual(result[result.length - 1]!.score ?? 0);
    expect(elapsed).toBeLessThan(PERF_THRESHOLD_MS);
  });
});
