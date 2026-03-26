import { vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { SwipeableRecipeCard, getRotationForDrag } from './SwipeableRecipeCard';
import type { Recipe } from '@mealroulette/shared-types';

const recipe: Recipe = {
  id: '1',
  name: 'Test Recipe',
  description: 'A test description',
  calories: 350,
  protein: 30,
  carbs: 40,
  fat: 12,
  servings: 1,
  tags: ['healthy'],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('SwipeableRecipeCard', () => {
  it('renders recipe name', () => {
    render(
      <SwipeableRecipeCard
        recipe={recipe}
        index={0}
        swipeDirection={null}
        onSwipe={vi.fn()}
        zIndex={1}
      />
    );
    expect(screen.getByText('Test Recipe')).toBeInTheDocument();
  });

  it('renders macros (calories, protein, carbs, fat)', () => {
    render(
      <SwipeableRecipeCard
        recipe={recipe}
        index={0}
        swipeDirection={null}
        onSwipe={vi.fn()}
        zIndex={1}
      />
    );
    expect(screen.getByText('350')).toBeInTheDocument();
    expect(screen.getByText('30g')).toBeInTheDocument();
    expect(screen.getByText('40g')).toBeInTheDocument();
    expect(screen.getByText('12g')).toBeInTheDocument();
  });

  it('renders image when imageUrl is provided', () => {
    const withImage = { ...recipe, imageUrl: 'https://example.com/img.jpg' };
    render(
      <SwipeableRecipeCard
        recipe={withImage}
        index={0}
        swipeDirection={null}
        onSwipe={vi.fn()}
        zIndex={1}
      />
    );
    const img = screen.getByRole('img', { name: 'Test Recipe' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/img.jpg');
    expect(img).toHaveAttribute('loading', 'lazy');
  });

  it('renders placeholder when imageUrl is missing', () => {
    render(
      <SwipeableRecipeCard
        recipe={recipe}
        index={0}
        swipeDirection={null}
        onSwipe={vi.fn()}
        zIndex={1}
      />
    );
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(document.querySelector('.recipe-card__placeholder')).toBeInTheDocument();
  });

  it('calls onSwipe with "right" when Like (ArrowRight) is pressed', () => {
    const onSwipe = vi.fn();
    render(
      <SwipeableRecipeCard
        recipe={recipe}
        index={0}
        swipeDirection={null}
        onSwipe={onSwipe}
        zIndex={1}
      />
    );
    const article = screen.getByRole('article');
    fireEvent.keyDown(article, { key: 'ArrowRight', code: 'ArrowRight' });
    expect(onSwipe).toHaveBeenCalledWith('right');
  });

  it('calls onSwipe with "left" when Pass (ArrowLeft) is pressed', () => {
    const onSwipe = vi.fn();
    render(
      <SwipeableRecipeCard
        recipe={recipe}
        index={0}
        swipeDirection={null}
        onSwipe={onSwipe}
        zIndex={1}
      />
    );
    const article = screen.getByRole('article');
    fireEvent.keyDown(article, { key: 'ArrowLeft', code: 'ArrowLeft' });
    expect(onSwipe).toHaveBeenCalledWith('left');
  });

  it('calls onSwipe with "right" when Enter is pressed (default action)', () => {
    const onSwipe = vi.fn();
    render(
      <SwipeableRecipeCard
        recipe={recipe}
        index={0}
        swipeDirection={null}
        onSwipe={onSwipe}
        zIndex={1}
      />
    );
    const article = screen.getByRole('article');
    fireEvent.keyDown(article, { key: 'Enter', code: 'Enter' });
    expect(onSwipe).toHaveBeenCalledWith('right');
  });

  it('rotation is proportional to drag and clamped', () => {
    expect(getRotationForDrag(0)).toBe(0);
    expect(getRotationForDrag(50)).toBeCloseTo(6);
    expect(getRotationForDrag(200)).toBe(15);
    expect(getRotationForDrag(-200)).toBe(-15);
  });
});
