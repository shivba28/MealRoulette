import { create } from 'zustand';

export type SwipeDirection = 'left' | 'right';

export interface SwipeRecord {
  recipeId: string;
  direction: SwipeDirection;
  timestamp: number;
  /** Release velocity (px/ms) for analytics. */
  velocity: number;
}

export interface SwipeState {
  /** History of swipes for analytics integration. */
  swipeHistory: SwipeRecord[];
  /** Max history length to avoid unbounded growth. */
  maxHistoryLength: number;
  /** Record a swipe (called by deck on each Like/Pass). */
  recordSwipe: (
    recipeId: string,
    direction: SwipeDirection,
    velocity?: number
  ) => void;
  /** Clear history (e.g. for testing or new session). */
  clearHistory: () => void;
}

const DEFAULT_MAX_HISTORY = 500;

export const useSwipeStore = create<SwipeState>((set) => ({
  swipeHistory: [],
  maxHistoryLength: DEFAULT_MAX_HISTORY,
  recordSwipe: (recipeId, direction, velocity = 0) =>
    set((state) => {
      const record: SwipeRecord = {
        recipeId,
        direction,
        timestamp: Date.now(),
        velocity,
      };
      const next = [record, ...state.swipeHistory].slice(
        0,
        state.maxHistoryLength
      );
      return { swipeHistory: next };
    }),
  clearHistory: () => set({ swipeHistory: [] }),
}));

/** Selector: total likes in history (for analytics). */
export function selectLikeCount(history: SwipeRecord[]): number {
  return history.filter((r) => r.direction === 'right').length;
}

/** Selector: total passes in history (for analytics). */
export function selectPassCount(history: SwipeRecord[]): number {
  return history.filter((r) => r.direction === 'left').length;
}

/** Selector: recent swipes in last N ms (for analytics time windows). */
export function selectSwipesInWindow(
  history: SwipeRecord[],
  windowMs: number
): SwipeRecord[] {
  const since = Date.now() - windowMs;
  return history.filter((r) => r.timestamp >= since);
}
