import { NutritionInfo } from './NutritionInfo';
import type { NutritionInfo as NutritionInfoDTO } from '@mealroulette/shared-types';

describe('NutritionInfo', () => {
  describe('fromDTO', () => {
    it('creates valid NutritionInfo from valid DTO', () => {
      const dto: NutritionInfoDTO = {
        recipeId: 'r1',
        calories: 300,
        protein: 25,
        carbs: 40,
        fat: 10,
        perServing: true,
      };
      const info = NutritionInfo.fromDTO(dto);
      expect(info.recipeId).toBe('r1');
      expect(info.calories).toBe(300);
      expect(info.protein).toBe(25);
      expect(info.carbs).toBe(40);
      expect(info.fat).toBe(10);
      expect(info.perServing).toBe(true);
    });

    it('throws on negative calories', () => {
      const dto: NutritionInfoDTO = {
        recipeId: 'r1',
        calories: -100,
        protein: 25,
        carbs: 40,
        fat: 10,
        perServing: true,
      };
      expect(() => NutritionInfo.fromDTO(dto)).toThrow('Nutrition values cannot be negative');
    });

    it('throws on negative protein', () => {
      const dto: NutritionInfoDTO = {
        recipeId: 'r1',
        calories: 300,
        protein: -1,
        carbs: 40,
        fat: 10,
        perServing: true,
      };
      expect(() => NutritionInfo.fromDTO(dto)).toThrow('Nutrition values cannot be negative');
    });
  });

  describe('toDTO', () => {
    it('round-trips valid entity to DTO', () => {
      const dto: NutritionInfoDTO = {
        recipeId: 'r1',
        calories: 300,
        protein: 25,
        carbs: 40,
        fat: 10,
        perServing: true,
        fiber: 5,
      };
      const info = NutritionInfo.fromDTO(dto);
      const back = info.toDTO();
      expect(back.recipeId).toBe(dto.recipeId);
      expect(back.calories).toBe(dto.calories);
      expect(back.fiber).toBe(5);
    });
  });
});
