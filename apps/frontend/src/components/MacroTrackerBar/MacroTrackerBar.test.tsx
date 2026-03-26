import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { MacroTrackerBar } from './MacroTrackerBar';
import type { MacroTrackerBarRef } from './MacroTrackerBar';

// Avoid GSAP animations in tests
vi.mock('gsap', () => ({
  gsap: {
    fromTo: vi.fn(),
    to: vi.fn((_target: unknown, _vars: unknown, opts?: { onComplete?: () => void }) => {
      if (opts?.onComplete) opts.onComplete();
    }),
  },
}));

const defaultTargets = {
  protein: 150,
  carbs: 200,
  fat: 70,
  calories: 2000,
};

describe('MacroTrackerBar', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders collapsed bar with macro pills', () => {
    render(<MacroTrackerBar ref={null} targets={defaultTargets} />);
    const expandBtn = screen.getByRole('button', { name: /expand macro tracker/i });
    expect(expandBtn).toBeInTheDocument();
    const withinCollapsed = within(expandBtn);
    expect(withinCollapsed.getByText(/P:\s*0g/)).toBeInTheDocument();
    expect(withinCollapsed.getByText(/C:\s*0g/)).toBeInTheDocument();
    expect(withinCollapsed.getByText(/F:\s*0g/)).toBeInTheDocument();
    expect(withinCollapsed.getByText(/Cal:\s*0/)).toBeInTheDocument();
  });

  it('addMeal updates progress and today meals list', () => {
    const ref = createRef<MacroTrackerBarRef | null>();
    render(<MacroTrackerBar ref={ref} targets={defaultTargets} />);

    act(() => {
      ref.current?.addMeal({
        recipeId: 'r1',
        recipeName: 'Test Recipe',
        protein: 25,
        carbs: 40,
        fat: 12,
        calories: 350,
        loggedAt: new Date().toISOString(),
      });
    });

    const expandBtn = screen.getByRole('button', { name: /expand macro tracker/i });
    const withinCollapsed = within(expandBtn);
    expect(withinCollapsed.getByText(/P:\s*25g/)).toBeInTheDocument();
    expect(withinCollapsed.getByText(/C:\s*40g/)).toBeInTheDocument();
    expect(withinCollapsed.getByText(/F:\s*12g/)).toBeInTheDocument();
    expect(withinCollapsed.getByText(/Cal:\s*350/)).toBeInTheDocument();
  });

  it('expanded panel shows today meals and progress bars', async () => {
    const user = userEvent.setup();
    const ref = createRef<MacroTrackerBarRef | null>();
    render(<MacroTrackerBar ref={ref} targets={defaultTargets} />);

    act(() => {
      ref.current?.addMeal({
        recipeId: 'r1',
        recipeName: 'Breakfast Bowl',
        protein: 20,
        carbs: 30,
        fat: 10,
        calories: 280,
        loggedAt: new Date().toISOString(),
      });
    });

    await user.click(screen.getByRole('button', { name: /expand macro tracker/i }));

    expect(screen.getByRole('button', { name: /collapse macro tracker/i })).toBeInTheDocument();
    expect(screen.getByText(/Meals today/)).toBeInTheDocument();
    expect(screen.getByText('Breakfast Bowl')).toBeInTheDocument();
    expect(screen.getByText('Protein')).toBeInTheDocument();
    expect(screen.getByText('Carbs')).toBeInTheDocument();
    expect(screen.getByText('Fat')).toBeInTheDocument();
    expect(screen.getByText('Calories')).toBeInTheDocument();
  });
});
