import type { MacroPreferences as MacroPreferencesDTO } from '@mealroulette/shared-types';

/**
 * Domain entity: user macro targets and tolerance.
 */
export class MacroPreferences {
  constructor(
    public readonly proteinTarget: number,
    public readonly carbsTarget: number,
    public readonly fatTarget: number,
    public readonly calorieCap: number | undefined,
    public readonly tolerance: number
  ) {}

  static fromDTO(dto: MacroPreferencesDTO): MacroPreferences {
    return new MacroPreferences(
      dto.proteinTarget,
      dto.carbsTarget,
      dto.fatTarget,
      dto.calorieCap,
      dto.tolerance ?? 0.15
    );
  }
}
