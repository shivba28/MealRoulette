import { Recipe } from '../../domain/Recipe.js';
import type { RecipeRepository } from '../../domain/repositories/RecipeRepository.js';

const SEED: Recipe[] = [
  Recipe.fromDTO({
    id: '1',
    name: 'Grilled Chicken Salad',
    description: 'Lean protein with fresh greens',
    calories: 420,
    protein: 38,
    carbs: 22,
    fat: 18,
    servings: 1,
    tags: ['healthy', 'high-protein'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
  Recipe.fromDTO({
    id: '2',
    name: 'Oatmeal with Berries',
    description: 'High-fiber breakfast',
    calories: 320,
    protein: 12,
    carbs: 52,
    fat: 8,
    servings: 1,
    tags: ['breakfast', 'fiber'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
];

export class InMemoryRecipeRepository implements RecipeRepository {
  private readonly store = [...SEED];

  async findAll(limit: number, offset: number): Promise<Recipe[]> {
    return this.store.slice(offset, offset + limit);
  }

  async findById(id: string): Promise<Recipe | null> {
    return this.store.find((r) => r.id === id) ?? null;
  }
}
