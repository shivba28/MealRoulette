import type { SwipeEvent as SwipeEventDTO } from '@mealroulette/shared-types';

/**
 * Domain entity: a single swipe (left/right) on a recipe.
 */
export class SwipeEvent {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly recipeId: string,
    public readonly direction: 'left' | 'right',
    public readonly timestamp: string,
    public readonly sessionId?: string,
    public readonly deviceId?: string
  ) {}

  static fromDTO(dto: SwipeEventDTO): SwipeEvent {
    return new SwipeEvent(
      dto.id,
      dto.userId,
      dto.recipeId,
      dto.direction,
      dto.timestamp,
      dto.sessionId,
      dto.deviceId
    );
  }
}
