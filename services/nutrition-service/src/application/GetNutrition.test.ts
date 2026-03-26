import { GetNutrition } from './GetNutrition';
import { MockNutritionRepository } from '../infrastructure/MockNutritionRepository';

describe('GetNutrition', () => {
  const repository = new MockNutritionRepository();
  const getNutrition = new GetNutrition(repository);

  it('returns valid NutritionInfo for existing recipe ID', async () => {
    const result = await getNutrition.byRecipeId('1');
    expect(result).not.toBeNull();
    expect(result!.recipeId).toBe('1');
    expect(result!.calories).toBe(420);
    expect(result!.protein).toBe(38);
    expect(result!.carbs).toBe(22);
    expect(result!.fat).toBe(18);
    expect(result!.perServing).toBe(true);
  });

  it('returns null for missing recipe ID', async () => {
    const result = await getNutrition.byRecipeId('nonexistent-id-999');
    expect(result).toBeNull();
  });

  it('byRecipeIds returns only matching nutrition infos', async () => {
    const result = await getNutrition.byRecipeIds(['1', 'missing', '2']);
    expect(result).toHaveLength(2);
    const ids = result.map((n) => n.recipeId).sort();
    expect(ids).toEqual(['1', '2']);
  });
});
