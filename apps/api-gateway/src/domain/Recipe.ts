import type { Recipe as RecipeDTO } from '@mealroulette/shared-types';

/**
 * Domain entity: Recipe.
 * Encapsulates identity and invariants; mapping to/from DTOs at boundaries.
 */
export class Recipe {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly calories: number,
    public readonly protein: number,
    public readonly carbs: number,
    public readonly fat: number,
    public readonly servings: number,
    public readonly tags: string[],
    public readonly createdAt: string,
    public readonly updatedAt: string,
    public readonly imageUrl?: string,
    public readonly cookTimeMinutes?: number
  ) {}

  static fromDTO(dto: RecipeDTO): Recipe {
    return new Recipe(
      dto.id,
      dto.name,
      dto.description,
      dto.calories,
      dto.protein,
      dto.carbs,
      dto.fat,
      dto.servings,
      dto.tags,
      dto.createdAt,
      dto.updatedAt,
      dto.imageUrl,
      dto.cookTimeMinutes
    );
  }

  toDTO(): RecipeDTO {
    const dto: RecipeDTO = {
      id: this.id,
      name: this.name,
      description: this.description,
      calories: this.calories,
      protein: this.protein,
      carbs: this.carbs,
      fat: this.fat,
      servings: this.servings,
      tags: this.tags,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
    if (this.imageUrl !== undefined) dto.imageUrl = this.imageUrl;
    if (this.cookTimeMinutes !== undefined) dto.cookTimeMinutes = this.cookTimeMinutes;
    return dto;
  }
}
