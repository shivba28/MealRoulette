import type { RecipeRepository } from '../domain/repositories/RecipeRepository.js';
import type { Recipe } from '@mealroulette/shared-types';

export interface GetRecipesInput {
  limit: number;
  offset: number;
}

export interface GetRecipesResult {
  recipes: Recipe[];
}

/**
 * Application use case: get a paginated list of recipes.
 * Depends on RecipeRepository (dependency inversion).
 */
export class GetRecipes {
  constructor(private readonly recipeRepository: RecipeRepository) {}

  async execute(input: GetRecipesInput): Promise<GetRecipesResult> {
    const domainRecipes = await this.recipeRepository.findAll(
      input.limit,
      input.offset
    );
    const recipes: Recipe[] = domainRecipes.map((r) => r.toDTO());
    return { recipes };
  }
}
