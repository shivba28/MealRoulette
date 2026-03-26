import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HistoryPanel } from './HistoryPanel';
import * as macroLog from '@/services/macroLog';

vi.mock('@/services/macroLog', async (importOriginal) => {
  const actual = await importOriginal<typeof macroLog>();
  return {
    ...actual,
    getAllMacroLogKeys: vi.fn(),
    getMacroLogByKey: vi.fn(),
  };
});

vi.mock('@/utils/streakUtils', () => ({ calculateStreak: vi.fn(() => 0) }));

vi.mock('gsap', () => ({
  gsap: {
    fromTo: vi.fn(),
    to: vi.fn((_target: unknown, vars: unknown) => {
      const v = vars as { onComplete?: () => void } | undefined;
      if (v?.onComplete) v.onComplete();
    }),
    killTweensOf: vi.fn(),
  },
}));

describe('HistoryPanel', () => {
  beforeEach(() => {
    vi.mocked(macroLog.getAllMacroLogKeys).mockReturnValue([]);
    vi.mocked(macroLog.getMacroLogByKey).mockReturnValue(null);
  });

  it('renders empty state when no meals logged', () => {
    vi.mocked(macroLog.getAllMacroLogKeys).mockReturnValue([]);
    render(<HistoryPanel isOpen onClose={() => {}} />);

    expect(screen.getByRole('dialog', { name: /meal history/i })).toBeInTheDocument();
    expect(screen.getByText('Meal History')).toBeInTheDocument();
    expect(screen.getByText('No meals logged yet')).toBeInTheDocument();
    expect(screen.getByText('Spin the wheel to get started')).toBeInTheDocument();
  });

  it('groups meals by date with Today / Yesterday labels', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return d.toISOString().slice(0, 10);
    })();

    vi.mocked(macroLog.getAllMacroLogKeys).mockReturnValue([
      `macro-log-${today}`,
      `macro-log-${yesterday}`,
    ]);
    vi.mocked(macroLog.getMacroLogByKey).mockImplementation((key: string) => {
      const date = key.replace('macro-log-', '');
      if (date === today) {
        return {
          date: today,
          meals: [
            {
              recipeId: '1',
              recipeName: 'Today Lunch',
              protein: 30,
              carbs: 40,
              fat: 15,
              calories: 400,
              loggedAt: new Date().toISOString(),
            },
          ],
        };
      }
      if (date === yesterday) {
        return {
          date: yesterday,
          meals: [
            {
              recipeId: '2',
              recipeName: 'Yesterday Dinner',
              protein: 25,
              carbs: 35,
              fat: 12,
              calories: 350,
              loggedAt: new Date().toISOString(),
            },
          ],
        };
      }
      return null;
    });

    render(<HistoryPanel isOpen onClose={() => {}} />);

    // HistoryPanel defers grouping to the next tick.
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 0));

    expect(await screen.findByText(/Today —/)).toBeInTheDocument();
    expect(await screen.findByText(/Yesterday —/)).toBeInTheDocument();
    expect(await screen.findByText('Today Lunch')).toBeInTheDocument();
    expect(await screen.findByText('Yesterday Dinner')).toBeInTheDocument();
  });
});
