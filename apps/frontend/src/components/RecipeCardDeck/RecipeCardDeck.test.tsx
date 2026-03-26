import { vi, beforeEach, afterEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { RecipeCardDeck } from './RecipeCardDeck';
import type { Recipe } from '@mealroulette/shared-types';
import * as graphql from '@/services/graphql';
import {
  clearRecipeCache,
  putRecipesInCache,
} from '@/services/cache';

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

describe('RecipeCardDeck', () => {
  beforeEach(async () => {
    await clearRecipeCache();
    vi.spyOn(graphql, 'getRecipes').mockResolvedValue({
      recipes: [
        mockRecipe('1'),
        mockRecipe('2'),
        mockRecipe('3'),
        mockRecipe('4'),
        mockRecipe('5'),
        mockRecipe('6'),
      ],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fires onSwipe with recipe and direction when user swipes (keyboard)', async () => {
    const onSwipe = vi.fn();
    const user = userEvent.setup();
    render(<RecipeCardDeck onSwipe={onSwipe} />);
    await waitFor(() => {
      expect(screen.getByText('Recipe 1')).toBeInTheDocument();
    });
    const topCard = screen.getByRole('article', { name: 'Recipe 1' });
    topCard.focus();
    await user.keyboard('{ArrowRight}');
    await waitFor(
      () => {
        expect(onSwipe).toHaveBeenCalledWith(
          expect.objectContaining({ id: '1', name: 'Recipe 1' }),
          'right',
          0
        );
      },
      { timeout: 500 }
    );
  });

  it('preloads next batch when deck falls below 3 cards', async () => {
    vi.mocked(graphql.getRecipes)
      .mockResolvedValueOnce({ recipes: [mockRecipe('1'), mockRecipe('2')] })
      .mockResolvedValueOnce({
        recipes: [mockRecipe('3'), mockRecipe('4'), mockRecipe('5')],
      });
    render(<RecipeCardDeck />);
    await waitFor(() => {
      expect(screen.getByText('Recipe 1')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(graphql.getRecipes).toHaveBeenCalledWith({ limit: 20, offset: 0 });
      expect(graphql.getRecipes).toHaveBeenCalledWith({ limit: 20, offset: 2 });
    });
    expect(graphql.getRecipes).toHaveBeenCalled();
  });

  it('records swipe in Zustand store when user swipes', async () => {
    const user = userEvent.setup();
    const { useSwipeStore } = await import('@/state/swipeStore');
    useSwipeStore.getState().clearHistory();
    render(<RecipeCardDeck />);
    await waitFor(() => {
      expect(screen.getByText('Recipe 1')).toBeInTheDocument();
    });
    const topCard = screen.getByRole('article', { name: 'Recipe 1' });
    topCard.focus();
    await user.keyboard('{ArrowLeft}');
    await waitFor(
      () => {
        const history = useSwipeStore.getState().swipeHistory;
        expect(history).toHaveLength(1);
        expect(history[0]).toMatchObject({
          recipeId: '1',
          direction: 'left',
          velocity: expect.any(Number),
        });
      },
      { timeout: 500 }
    );
  });

  it('uses cached recipes when offline (deck shows cache when cache has enough)', async () => {
    const cached = Array.from({ length: 20 }, (_, i) =>
      mockRecipe(`cached-${i + 1}`)
    );
    await putRecipesInCache(cached);
    vi.mocked(graphql.getRecipes).mockRejectedValue(new Error('Network error'));
    render(<RecipeCardDeck />);
    await waitFor(() => {
      expect(screen.getByText('Recipe cached-1')).toBeInTheDocument();
    });
    expect(screen.getByText('Recipe cached-2')).toBeInTheDocument();
    expect(screen.getByText('Recipe cached-3')).toBeInTheDocument();
  });

  it('shows loading state while fetching', async () => {
    let resolve: (value: { recipes: Recipe[] }) => void;
    const fetchPromise = new Promise<{ recipes: Recipe[] }>((r) => {
      resolve = r;
    });
    vi.mocked(graphql.getRecipes).mockReturnValue(fetchPromise);
    render(<RecipeCardDeck />);
    await waitFor(() => {
      expect(screen.getByTestId('deck-loading')).toBeInTheDocument();
    });
    resolve!({ recipes: [mockRecipe('load-1')] });
    await waitFor(() => {
      const cards = screen.getAllByRole('article', { name: 'Recipe load-1' });
      expect(cards.length).toBeGreaterThanOrEqual(1);
    });
  });
});
