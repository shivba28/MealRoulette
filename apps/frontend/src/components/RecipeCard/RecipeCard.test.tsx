import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { RecipeCard } from './RecipeCard';
import type { Recipe } from '@mealroulette/shared-types';

expect.extend(toHaveNoViolations);

const recipe: Recipe = {
  id: '1',
  name: 'Test Recipe',
  description: 'A test recipe',
  calories: 300,
  protein: 25,
  carbs: 30,
  fat: 10,
  servings: 1,
  tags: ['test'],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('RecipeCard', () => {
  it('renders recipe name and description', () => {
    render(<RecipeCard recipe={recipe} />);
    expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    expect(screen.getByText('A test recipe')).toBeInTheDocument();
  });

  it('renders macros', () => {
    render(<RecipeCard recipe={recipe} />);
    expect(screen.getByText('300')).toBeInTheDocument();
    expect(screen.getByText('25g')).toBeInTheDocument();
    expect(screen.getByText('30g')).toBeInTheDocument();
    expect(screen.getByText('10g')).toBeInTheDocument();
  });

  it('renders ingredients list when present', () => {
    const fullRecipe: Recipe = {
      ...recipe,
      ingredients: ['2 eggs', '1 cup flour'],
      steps: ['Mix', 'Bake'],
    };
    render(<RecipeCard recipe={fullRecipe} />);
    expect(screen.getByRole('heading', { name: /ingredients/i })).toBeInTheDocument();
    expect(screen.getByText('2 eggs')).toBeInTheDocument();
    expect(screen.getByText('1 cup flour')).toBeInTheDocument();
  });

  it('renders steps when present', () => {
    const fullRecipe: Recipe = {
      ...recipe,
      ingredients: [],
      steps: ['Step one', 'Step two'],
    };
    render(<RecipeCard recipe={fullRecipe} />);
    expect(screen.getByRole('heading', { name: /steps/i })).toBeInTheDocument();
    expect(screen.getByText('Step one')).toBeInTheDocument();
    expect(screen.getByText('Step two')).toBeInTheDocument();
  });

  it('renders video link when videoUrl present', () => {
    const withVideo: Recipe = { ...recipe, videoUrl: 'https://example.com/video' };
    render(<RecipeCard recipe={withVideo} />);
    const link = screen.getByRole('link', { name: /watch video/i });
    expect(link).toHaveAttribute('href', 'https://example.com/video');
  });

  it('renders action buttons when onSwipe is provided', () => {
    const onSwipe = vi.fn();
    render(<RecipeCard recipe={recipe} onSwipe={onSwipe} />);
    expect(screen.getByRole('button', { name: /pass/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /like/i })).toBeInTheDocument();
  });

  it('buttons do not render when onSwipe is undefined', () => {
    render(<RecipeCard recipe={recipe} />);
    expect(screen.queryByRole('button', { name: /pass/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /like/i })).not.toBeInTheDocument();
  });

  it('onSwipe callback fires with "right" when Like is clicked', async () => {
    const onSwipe = vi.fn();
    const user = userEvent.setup();
    render(<RecipeCard recipe={recipe} onSwipe={onSwipe} />);
    await user.click(screen.getByRole('button', { name: /like/i }));
    expect(onSwipe).toHaveBeenCalledTimes(1);
    expect(onSwipe).toHaveBeenCalledWith('right');
  });

  it('onSwipe callback fires with "left" when Pass is clicked', async () => {
    const onSwipe = vi.fn();
    const user = userEvent.setup();
    render(<RecipeCard recipe={recipe} onSwipe={onSwipe} />);
    await user.click(screen.getByRole('button', { name: /pass/i }));
    expect(onSwipe).toHaveBeenCalledTimes(1);
    expect(onSwipe).toHaveBeenCalledWith('left');
  });

  it('matches snapshot', () => {
    const { container } = render(<RecipeCard recipe={recipe} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<RecipeCard recipe={recipe} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has no accessibility violations when onSwipe is provided', async () => {
    const onSwipe = vi.fn();
    const { container } = render(<RecipeCard recipe={recipe} onSwipe={onSwipe} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
