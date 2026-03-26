/** Sentinel for "no max" cook time; stored as undefined in preferences. */
export const COOK_TIME_NO_MAX = 60;

export interface TimePillSelectorProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  'data-testid'?: string;
}

const OPTIONS: { label: string; value: number }[] = [
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '1 hr+', value: COOK_TIME_NO_MAX },
];

export function TimePillSelector({
  value,
  onChange,
  'data-testid': testId,
}: TimePillSelectorProps) {
  return (
    <div className="time-pill-selector" role="group" data-testid={testId}>
      {OPTIONS.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.label}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`time-pill time-pill-selector__pill ${selected ? 'time-pill--selected time-pill-selector__pill--selected active' : ''}`}
            data-value={opt.value}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
