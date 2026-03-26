import { NutritionInfo } from '../domain/NutritionInfo';
import type { NutritionRepository } from '../domain/repositories/NutritionRepository';

const mockData: NutritionInfo[] = [
  new NutritionInfo('1', 420, 38, 22, 18, true, 5, 400, 3, 250),
  new NutritionInfo('2', 320, 12, 52, 8, true, 8, 200, 12, 150),
];

export class MockNutritionRepository implements NutritionRepository {
  async getByRecipeId(recipeId: string): Promise<NutritionInfo | null> {
    return mockData.find((n) => n.recipeId === recipeId) ?? null;
  }

  async getByRecipeIds(recipeIds: string[]): Promise<NutritionInfo[]> {
    return mockData.filter((n) => recipeIds.includes(n.recipeId));
  }
}
