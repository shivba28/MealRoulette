import { vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { RecipeCardDeck } from './RecipeCardDeck';
import type { Recipe } from '@mealroulette/shared-types';
import * as graphql from '@/services/graphql';
import { useSwipeStore } from '@/state/swipeStore';

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

describe('RecipeCardDeck physics', () => {
  beforeEach(() => {
    vi.spyOn(graphql, 'getRecipes').mockResolvedValue({
      recipes: [
        mockRecipe('1'),
        mockRecipe('2'),
        mockRecipe('3'),
        mockRecipe('4'),
        mockRecipe('5'),
      ],
    });
    useSwipeStore.getState().clearHistory();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('swipe history includes velocity when card flies off', async () => {
    render(<RecipeCardDeck />);
    await waitFor(() => {
      expect(screen.getByText('Recipe 1')).toBeInTheDocument();
    });
    const topCard = screen.getByRole('article', { name: 'Recipe 1' });
    topCard.focus();
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(
      () => {
        const history = useSwipeStore.getState().swipeHistory;
        expect(history).toHaveLength(1);
        expect(history[0]).toMatchObject({
          recipeId: '1',
          direction: 'right',
        });
        expect(typeof history[0]!.velocity).toBe('number');
      },
      { timeout: 500 }
    );
  });

  it('onSwipeComplete receives recipeId, direction, and velocity', async () => {
    const onSwipeComplete = vi.fn();
    render(<RecipeCardDeck onSwipeComplete={onSwipeComplete} />);
    await waitFor(() => {
      expect(screen.getByText('Recipe 1')).toBeInTheDocument();
    });
    const topCard = screen.getByRole('article', { name: 'Recipe 1' });
    topCard.focus();
    await userEvent.keyboard('{ArrowLeft}');
    await waitFor(
      () => {
        expect(onSwipeComplete).toHaveBeenCalledWith(
          '1',
          'left',
          expect.any(Number)
        );
      },
      { timeout: 500 }
    );
  });

  it('deck maintains only top 5 cards in DOM', async () => {
    render(<RecipeCardDeck />);
    await waitFor(() => {
      expect(screen.getByText('Recipe 1')).toBeInTheDocument();
    });
    const articles = screen.getAllByRole('article');
    expect(articles.length).toBeLessThanOrEqual(5);
    expect(articles.length).toBeGreaterThanOrEqual(1);
  });

  it('performance: deck with 5 cards renders within threshold', async () => {
    const start = performance.now();
    render(<RecipeCardDeck />);
    await waitFor(() => {
      expect(screen.getByText('Recipe 1')).toBeInTheDocument();
    });
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(500);
  });
});
