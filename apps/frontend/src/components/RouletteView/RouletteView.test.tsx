import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouletteView } from './RouletteView';

describe('RouletteView', () => {
  it('shows CTA "What should I make?" when idle', () => {
    render(<RouletteView />);
    expect(screen.getByRole('button', { name: /what should i make/i })).toBeInTheDocument();
  });

  it('shows wheel in spinning state when CTA clicked', async () => {
    const user = userEvent.setup();
    render(<RouletteView />);
    await user.click(screen.getByTestId('roulette-cta'));
    await waitFor(() => {
      expect(screen.getByTestId('roulette-wheel')).toBeInTheDocument();
      expect(screen.getByTestId('roulette-cta')).toBeDisabled();
    });
  });
});
