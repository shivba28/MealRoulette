import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuantityPicker } from './QuantityPicker';

describe('QuantityPicker', () => {
  it('renders with value', () => {
    const onChange = vi.fn();
    render(
      <QuantityPicker min={0} max={100} step={5} value={50} onChange={onChange} />
    );
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveValue(50);
  });

  it('calling increment calls onChange with value + step', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <QuantityPicker min={0} max={100} step={5} value={50} onChange={onChange} />
    );
    await user.click(screen.getByRole('button', { name: /increase/i }));
    expect(onChange).toHaveBeenCalledWith(55);
  });

  it('calling decrement calls onChange with value - step', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <QuantityPicker min={0} max={100} step={5} value={50} onChange={onChange} />
    );
    await user.click(screen.getByRole('button', { name: /decrease/i }));
    expect(onChange).toHaveBeenCalledWith(45);
  });

  it('decrement button is disabled when value === min', () => {
    const onChange = vi.fn();
    render(
      <QuantityPicker min={0} max={100} step={5} value={0} onChange={onChange} />
    );
    expect(screen.getByRole('button', { name: /decrease/i })).toBeDisabled();
  });
});
