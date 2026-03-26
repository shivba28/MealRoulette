import { useState, useCallback } from 'react';
import type { Recipe } from '@mealroulette/shared-types';

export interface UseRecipeDeckOptions {
  /** Number of cards to show in the deck. */
  deckSize: number;
  /** Preload next batch when remaining cards fall below this. */
  preloadThreshold: number;
  /** Fetch recipes (e.g. from GraphQL). */
  fetchRecipes: (offset: number, limit: number) => Promise<Recipe[]>;
  /** Initial batch size. */
  batchSize?: number;
}

export interface UseRecipeDeckResult {
  /** Up to deckSize recipes to display (top = first). */
  deck: Recipe[];
  /** Whether more recipes are being loaded. */
  isLoading: boolean;
  /** Load initial or next batch (call when deck length < preloadThreshold). */
  ensureLoaded: () => Promise<void>;
  /** Remove the top recipe (after swipe). */
  consumeTop: () => void;
}

export function useRecipeDeck({
  deckSize,
  preloadThreshold,
  fetchRecipes,
  batchSize = 20,
}: UseRecipeDeckOptions): UseRecipeDeckResult {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const ensureLoaded = useCallback(async () => {
    if (recipes.length >= preloadThreshold || isLoading) return;
    setIsLoading(true);
    try {
      const next = await fetchRecipes(offset, batchSize);
      setRecipes((prev) => [...prev, ...next]);
      setOffset((o) => o + next.length);
    } finally {
      setIsLoading(false);
    }
  }, [recipes.length, preloadThreshold, offset, batchSize, fetchRecipes, isLoading]);

  const consumeTop = useCallback(() => {
    setRecipes((prev) => prev.slice(1));
  }, []);

  const deck = recipes.slice(0, deckSize);

  return { deck, isLoading, ensureLoaded, consumeTop };
}
