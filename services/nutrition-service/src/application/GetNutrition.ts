import type { NutritionRepository } from '../domain/repositories/NutritionRepository';
import type { NutritionInfo } from '../domain/NutritionInfo';

export class GetNutrition {
  constructor(private readonly repository: NutritionRepository) {}

  async byRecipeId(recipeId: string): Promise<NutritionInfo | null> {
    return this.repository.getByRecipeId(recipeId);
  }

  async byRecipeIds(recipeIds: string[]): Promise<NutritionInfo[]> {
    return this.repository.getByRecipeIds(recipeIds);
  }
}
