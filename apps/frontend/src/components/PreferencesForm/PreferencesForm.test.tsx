/**
 * Tests for PreferencesForm: updates store and persists offline.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor, within } from '@testing-library/react';
import { PreferencesForm } from './PreferencesForm';
import { useMacroPreferenceStore } from '@/state/macroPreferenceStore';
import {
  clearStoredPreferences,
  getStoredPreferences,
} from '@/services/cache';

describe('PreferencesForm', () => {
  beforeEach(async () => {
    useMacroPreferenceStore.getState().reset();
    await clearStoredPreferences();
  });

  it('renders quantity picker and range slider for macro fields', () => {
    render(<PreferencesForm />);
    expect(screen.getByTestId('pref-protein')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: /protein/i })).toBeInTheDocument();
  });

  it('updates store when user changes protein, carbs, fat', async () => {
    const user = userEvent.setup();
    render(<PreferencesForm />);
    const proteinInput = screen.getByTestId('pref-protein');
    const carbsInput = screen.getByTestId('pref-carbs');
    await user.clear(proteinInput);
    await user.type(proteinInput, '120');
    await user.clear(carbsInput);
    await user.type(carbsInput, '180');
    await waitFor(() => {
      expect(useMacroPreferenceStore.getState().proteinTarget).toBe(120);
      expect(useMacroPreferenceStore.getState().carbsTarget).toBe(180);
    });
  });

  it('auto-persists preferences to IndexedDB on change', async () => {
    const user = userEvent.setup();
    render(<PreferencesForm />);
    const proteinInput = screen.getByTestId('pref-protein');
    await user.clear(proteinInput);
    await user.type(proteinInput, '100');
    await waitFor(() => {
      expect(useMacroPreferenceStore.getState().proteinTarget).toBe(100);
    });
    await waitFor(async () => {
      const stored = await getStoredPreferences();
      expect(stored).not.toBeNull();
      expect(stored!.proteinTarget).toBe(100);
    });
  });

  it('does not render manual Save Preferences button', () => {
    render(<PreferencesForm />);
    expect(screen.queryByRole('button', { name: /save preferences/i })).not.toBeInTheDocument();
  });

  it('adds preferred ingredients from Proteins search and auto-persists', async () => {
    const user = userEvent.setup();
    render(<PreferencesForm />);
    const proteinsWrapper = screen.getByTestId('pref-proteins');
    const searchInput = within(proteinsWrapper).getByPlaceholderText(/search proteins/i);
    await user.click(searchInput);
    await user.type(searchInput, 'chicken');
    await waitFor(() => {
      expect(screen.getByRole('option', { name: /chicken/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('option', { name: /chicken/i }));
    expect(useMacroPreferenceStore.getState().preferredIngredients).not.toContain('Chicken');
    await waitFor(() => {
      expect(useMacroPreferenceStore.getState().preferredIngredients).toContain('Chicken');
    });
  });

});
