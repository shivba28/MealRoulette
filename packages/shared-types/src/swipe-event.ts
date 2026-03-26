export type SwipeDirection = 'left' | 'right';

export interface SwipeEvent {
  id: string;
  userId: string;
  recipeId: string;
  direction: SwipeDirection;
  timestamp: string;
  sessionId?: string;
  deviceId?: string;
}

export type SwipeEventInput = Omit<SwipeEvent, 'id' | 'timestamp'> & {
  timestamp?: string;
};
