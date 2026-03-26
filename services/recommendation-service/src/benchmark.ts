/**
 * Performance benchmark: score 10k, 50k, and 100k recipes and log execution time.
 * Run with: pnpm run benchmark (or npx ts-node --project tsconfig.json src/benchmark.ts)
 */
import { MacroPreferences } from './domain/MacroPreferences';
import { RecommendationEngine } from './application/RecommendationEngine';
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

function runBenchmark(size: number): number {
  const engine = new RecommendationEngine();
  const recipes = generateRecipes(size);
  const start = performance.now();
  const result = engine.recommend(recipes, prefs);
  const elapsed = performance.now() - start;
  const sorted =
    result.length <= 1 ||
    result.every((s, i) => i === 0 || (result[i - 1]!.score >= s.score));
  if (!sorted) throw new Error('recommend() did not return sorted scores');
  return elapsed;
}

function main(): void {
  const sizes = [10_000, 50_000, 100_000];
  console.log('RecommendationEngine benchmark (recommend N recipes)\n');
  for (const n of sizes) {
    const ms = runBenchmark(n);
    console.log(`${n.toLocaleString()} recipes: ${ms.toFixed(2)} ms`);
  }
}

main();
