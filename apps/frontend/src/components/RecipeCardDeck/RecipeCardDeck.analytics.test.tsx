/**
 * Tests for swipe events firing and analytics enqueue (no FPS drop).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { RecipeCardDeck } from './RecipeCardDeck';
import * as graphql from '@/services/graphql';
import { clearRecipeCache } from '@/services/cache';
import { clearSwipeQueue, getQueueLength } from '@/services/analytics';
import type { Recipe } from '@mealroulette/shared-types';

const mockRecipe = (id: string): Recipe => ({
  id,
  name: `Recipe ${id}`,
  description: 'Description',
  calories: 300,
  protein: 25,
  carbs: 35,
  fat: 10,
  servings: 1,
  tags: [],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
});

describe('RecipeCardDeck analytics', () => {
  beforeEach(async () => {
    await clearRecipeCache();
    await clearSwipeQueue();
    vi.spyOn(graphql, 'getRecipes').mockResolvedValue({
      recipes: [
        mockRecipe('1'),
        mockRecipe('2'),
        mockRecipe('3'),
        mockRecipe('4'),
        mockRecipe('5'),
      ],
    });
  });

  it('enqueues swipe event when user swipes (keyboard)', async () => {
    const user = userEvent.setup();
    render(<RecipeCardDeck />);
    await waitFor(() => {
      expect(screen.getByText('Recipe 1')).toBeInTheDocument();
    });
    const topCard = screen.getByRole('article', { name: 'Recipe 1' });
    topCard.focus();
    await user.keyboard('{ArrowRight}');
    await waitFor(
      async () => {
        const len = await getQueueLength();
        expect(len).toBeGreaterThanOrEqual(1);
      },
      { timeout: 500 }
    );
  });

  it('records swipe in Zustand and fires onSwipeComplete', async () => {
    const user = userEvent.setup();
    const onSwipeComplete = vi.fn();
    const { useSwipeStore } = await import('@/state/swipeStore');
    useSwipeStore.getState().clearHistory();
    render(<RecipeCardDeck onSwipeComplete={onSwipeComplete} />);
    await waitFor(() => {
      expect(screen.getByText('Recipe 1')).toBeInTheDocument();
    });
    const topCard = screen.getByRole('article', { name: 'Recipe 1' });
    topCard.focus();
    await user.keyboard('{ArrowLeft}');
    await waitFor(
      () => {
        expect(onSwipeComplete).toHaveBeenCalledWith(
          '1',
          'left',
          expect.any(Number)
        );
        const history = useSwipeStore.getState().swipeHistory;
        expect(history).toHaveLength(1);
        expect(history[0]).toMatchObject({
          recipeId: '1',
          direction: 'left',
        });
      },
      { timeout: 500 }
    );
  });
});
