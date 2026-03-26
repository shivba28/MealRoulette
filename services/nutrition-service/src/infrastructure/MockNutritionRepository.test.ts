import type { NutritionRepository } from '../domain/repositories/NutritionRepository';
import type { NutritionInfo } from '../domain/NutritionInfo';
import { MockNutritionRepository } from './MockNutritionRepository';

/**
 * Repository contract tests: any implementation of NutritionRepository
 * must satisfy these behaviors.
 */
function runRepositoryContractTests(
  name: string,
  repository: NutritionRepository
) {
  describe(`NutritionRepository contract: ${name}`, () => {
    it('getByRecipeId returns NutritionInfo or null', async () => {
      const result = await repository.getByRecipeId('any-id');
      expect(result === null || result instanceof Object).toBe(true);
      if (result !== null) {
        expect(typeof result.recipeId).toBe('string');
        expect(typeof result.calories).toBe('number');
        expect(typeof result.protein).toBe('number');
        expect(typeof result.carbs).toBe('number');
        expect(typeof result.fat).toBe('number');
        expect(typeof result.perServing).toBe('boolean');
      }
    });

    it('getByRecipeIds returns array of NutritionInfo', async () => {
      const result = await repository.getByRecipeIds([]);
      expect(Array.isArray(result)).toBe(true);
      result.forEach((item: NutritionInfo) => {
        expect(typeof item.recipeId).toBe('string');
        expect(typeof item.calories).toBe('number');
        expect(typeof item.protein).toBe('number');
        expect(typeof item.carbs).toBe('number');
        expect(typeof item.fat).toBe('number');
        expect(typeof item.perServing).toBe('boolean');
      });
    });
  });
}

describe('MockNutritionRepository', () => {
  runRepositoryContractTests('MockNutritionRepository', new MockNutritionRepository());

  it('returns null for unknown recipe ID', async () => {
    const repo = new MockNutritionRepository();
    const result = await repo.getByRecipeId('unknown');
    expect(result).toBeNull();
  });

  it('getByRecipeIds returns only stored recipe IDs', async () => {
    const repo = new MockNutritionRepository();
    const result = await repo.getByRecipeIds(['1', '2']);
    expect(result).toHaveLength(2);
  });
});
