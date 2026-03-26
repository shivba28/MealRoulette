import type { Recipe } from '../Recipe.js';

export interface RecipeRepository {
  findAll(limit: number, offset: number): Promise<Recipe[]>;
  findById(id: string): Promise<Recipe | null>;
}
