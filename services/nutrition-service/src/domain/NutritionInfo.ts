import type { NutritionInfo as NutritionInfoDTO } from '@mealroulette/shared-types';

/**
 * Domain entity: nutrition data for a recipe.
 */
export class NutritionInfo {
  constructor(
    public readonly recipeId: string,
    public readonly calories: number,
    public readonly protein: number,
    public readonly carbs: number,
    public readonly fat: number,
    public readonly perServing: boolean,
    public readonly fiber?: number,
    public readonly sodium?: number,
    public readonly sugar?: number,
    public readonly servingSizeGrams?: number
  ) {}

  static fromDTO(dto: NutritionInfoDTO): NutritionInfo {
    if (dto.calories < 0 || dto.protein < 0 || dto.carbs < 0 || dto.fat < 0) {
      throw new Error('Nutrition values cannot be negative');
    }
    if (dto.fiber !== undefined && dto.fiber < 0) throw new Error('Fiber cannot be negative');
    if (dto.sodium !== undefined && dto.sodium < 0) throw new Error('Sodium cannot be negative');
    if (dto.sugar !== undefined && dto.sugar < 0) throw new Error('Sugar cannot be negative');
    if (dto.servingSizeGrams !== undefined && dto.servingSizeGrams < 0) {
      throw new Error('Serving size cannot be negative');
    }
    return new NutritionInfo(
      dto.recipeId,
      dto.calories,
      dto.protein,
      dto.carbs,
      dto.fat,
      dto.perServing,
      dto.fiber,
      dto.sodium,
      dto.sugar,
      dto.servingSizeGrams
    );
  }

  toDTO(): NutritionInfoDTO {
    const dto: NutritionInfoDTO = {
      recipeId: this.recipeId,
      calories: this.calories,
      protein: this.protein,
      carbs: this.carbs,
      fat: this.fat,
      perServing: this.perServing,
    };
    if (this.fiber !== undefined) dto.fiber = this.fiber;
    if (this.sodium !== undefined) dto.sodium = this.sodium;
    if (this.sugar !== undefined) dto.sugar = this.sugar;
    if (this.servingSizeGrams !== undefined) dto.servingSizeGrams = this.servingSizeGrams;
    return dto;
  }
}
