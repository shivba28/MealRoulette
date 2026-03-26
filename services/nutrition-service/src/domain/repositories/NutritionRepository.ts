import type { NutritionInfo } from '../NutritionInfo';

export interface NutritionRepository {
  getByRecipeId(recipeId: string): Promise<NutritionInfo | null>;
  getByRecipeIds(recipeIds: string[]): Promise<NutritionInfo[]>;
}
