/**
 * React port of Jhey Tompkins' quantity-picker: scrolling number track + hidden input.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export interface QuantityPickerProps {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  id?: string;
  accentColor?: string;
  'data-testid'?: string;
}

export function QuantityPicker({
  min,
  max,
  step,
  value,
  onChange,
  disabled = false,
  id,
  accentColor = 'hsl(var(--primary))',
  'data-testid': dataTestId,
}: QuantityPickerProps) {
  const [inputValue, setInputValue] = useState(String(value));
  const trackRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(String(value));
  }, [value]);

  useEffect(() => {
    if (!trackRef.current) return;
    const numbers: number[] = [];
    for (let i = min; i <= max; i += step) numbers.push(i);
    trackRef.current.textContent = numbers.join('\n');
  }, [min, max, step]);

  useEffect(() => {
    if (trackRef.current) {
      const translateX = (min - value) / step;
      trackRef.current.style.setProperty('--translate-x', String(translateX));
    }
  }, [value, min, step]);

  const handleIncrement = useCallback(() => {
    const next = value + step;
    if (next > max) return;
    onChange(next);
  }, [value, step, max, onChange]);

  const handleDecrement = useCallback(() => {
    const next = value - step;
    if (next < min) return;
    onChange(next);
  }, [value, step, min, onChange]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setInputValue(raw);
      const num = parseFloat(raw);
      if (!Number.isNaN(num) && num >= min && num <= max) {
        onChange(num);
        if (trackRef.current) {
          trackRef.current.style.setProperty('--translate-x', String((min - num) / step));
        }
      }
    },
    [min, max, step, onChange]
  );

  const handleInputFocus = useCallback(() => {}, []);
  const handleInputBlur = useCallback(() => {
    const num = parseFloat(inputValue);
    if (Number.isNaN(num) || num < min) {
      onChange(min);
      setInputValue(String(min));
    } else if (num > max) {
      onChange(max);
      setInputValue(String(max));
    }
  }, [inputValue, min, max, onChange]);

  useEffect(() => {
    const el = pickerRef.current;
    if (!el) return;
    const onDown = () => el.classList.add('is-active');
    const onUp = () => el.classList.remove('is-active');
    const onLeave = () => el.classList.remove('is-active');
    el.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  const decDisabled = disabled || value - step < min;
  const incDisabled = disabled || value + step > max;

  return (
    <div
      ref={pickerRef}
      className="qty-picker"
      style={{ '--qty-accent': accentColor } as React.CSSProperties}
    >
      <button
        type="button"
        className="qty-picker__btn qty-picker__btn--dec"
        onClick={handleDecrement}
        disabled={decDisabled}
        aria-label="Decrease"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
          width={14}
          height={14}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
        </svg>
      </button>

      <div className="qty-picker__track-container">
        <input
          type="number"
          className="qty-picker__input"
          min={min}
          max={max}
          step={step}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          required
          id={id}
          disabled={disabled}
          data-testid={dataTestId}
          aria-invalid={inputValue !== '' && (parseFloat(inputValue) < min || parseFloat(inputValue) > max)}
        />
        <div
          className="qty-picker__track"
          ref={trackRef}
          aria-hidden
          style={{ '--translate-x': (min - value) / step } as React.CSSProperties}
          data-low-range-out={min - step}
          data-high-range-out={max + step}
        />
      </div>

      <button
        type="button"
        className="qty-picker__btn qty-picker__btn--inc"
        onClick={handleIncrement}
        disabled={incDisabled}
        aria-label="Increase"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
          width={14}
          height={14}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>
    </div>
  );
}
