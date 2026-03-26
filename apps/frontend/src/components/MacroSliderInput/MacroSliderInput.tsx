import { useRef, useState, useCallback, useId } from 'react';
import { QuantityPicker } from '@/components/QuantityPicker';

export interface MacroSliderInputProps {
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  value: number;
  onChange: (value: number) => void;
  'data-testid'?: string;
}

export function MacroSliderInput({
  label,
  min,
  max,
  step,
  value,
  onChange,
  'data-testid': testId,
}: MacroSliderInputProps) {
  const rafRef = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const id = useId();

  const clamped = Math.min(max, Math.max(min, value));

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = Number(e.target.value);
      if (Number.isNaN(val)) return;
      const next = Math.min(max, Math.max(min, val));
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        onChange(next);
        rafRef.current = null;
      });
    },
    [min, max, onChange]
  );

  const trackStyle = {
    '--value': clamped,
    '--min': min,
    '--max': max,
  } as React.CSSProperties;

  return (
    <div className="macro-slider-input">
      <div className="macro-slider__label-row">
        <label className="form-field-label" htmlFor={id}>
          {label}
        </label>
      </div>

      <div className="macro-slider__picker-row">
        <QuantityPicker
          id={id}
          min={min}
          max={max}
          step={step}
          value={clamped}
          onChange={onChange}
          {...(testId && { 'data-testid': testId })}
        />
      </div>

      <div
        className={`macro-slider ${isDragging ? 'is-dragging' : ''}`}
        style={trackStyle}
      >
        <div className="macro-slider__track">
          <div className="macro-slider__fill" aria-hidden />
          <div className="macro-slider__indicator" aria-hidden />
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={clamped}
            onChange={handleSliderChange}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
            onTouchStart={() => setIsDragging(true)}
            onTouchEnd={() => setIsDragging(false)}
            className="macro-slider__range macro-slider-input__slider"
            aria-label={label}
          />
        </div>
      </div>
    </div>
  );
}
