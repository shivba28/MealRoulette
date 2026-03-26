export interface NutritionInfo {
  recipeId: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sodium?: number;
  sugar?: number;
  servingSizeGrams?: number;
  perServing: boolean;
}
