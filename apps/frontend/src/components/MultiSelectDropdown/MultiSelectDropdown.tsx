import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import type {
  GroupBase,
  MenuListProps,
  MultiValueProps,
  OptionProps,
} from 'react-select';
import type { MultiValue } from 'react-select';
import Select, { components } from 'react-select';

export interface MultiSelectDropdownOption {
  value: string;
  label: string;
}

type Option = MultiSelectDropdownOption;

const AnimatedMenuList = (props: MenuListProps<Option, true, GroupBase<Option>>) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      gsap.fromTo(
        ref.current,
        { opacity: 0, y: -8, scaleY: 0.95, transformOrigin: 'top center' },
        { opacity: 1, y: 0, scaleY: 1, duration: 0.2, ease: 'power2.out' }
      );
    }
  }, []);

  return <div ref={ref}>{props.children}</div>;
};

const AnimatedOption = (props: OptionProps<Option, true, GroupBase<Option>>) => {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (ref.current) gsap.to(ref.current, { x: 4, duration: 0.15, ease: 'power1.out' });
  };
  const handleMouseLeave = () => {
    if (ref.current) gsap.to(ref.current, { x: 0, duration: 0.15, ease: 'power1.out' });
  };

  return (
    <div ref={ref} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <components.Option {...props} />
    </div>
  );
};

const AnimatedMultiValue = (props: MultiValueProps<Option, true, GroupBase<Option>>) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      gsap.fromTo(
        ref.current,
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.25, ease: 'back.out(2.5)' }
      );
    }
  }, []);

  return (
    <div ref={ref} style={{ display: 'inline-flex' }}>
      <components.MultiValue {...props} />
    </div>
  );
};

export interface MultiSelectDropdownProps {
  options: MultiSelectDropdownOption[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  'data-testid'?: string;
}

const customStyles = {
  control: (base: object, state: { isFocused?: boolean }) => ({
    ...base,
    background: 'var(--bg-input)',
    border: state?.isFocused ? '2px solid var(--chili)' : '2px solid var(--ink)',
    borderRadius: 0,
    boxShadow: 'none',
    color: 'var(--ink)',
    minHeight: '44px',
    transition: 'border-color 0.2s',
  }),
  menu: (base: object) => ({
    ...base,
    background: 'var(--paper)',
    border: '2px solid var(--ink)',
    borderRadius: 0,
    boxShadow: 'none',
  }),
  option: (base: object, state: { isFocused?: boolean; isSelected?: boolean }) => ({
    ...base,
    background: state?.isSelected
      ? 'rgba(192, 57, 43, 0.15)'
      : state?.isFocused
      ? 'rgba(192, 57, 43, 0.08)'
      : 'transparent',
    color: state?.isSelected ? 'var(--chili)' : 'var(--ink)',
    cursor: 'pointer',
    transition: 'background 0.15s',
  }),
  multiValue: (base: object) => ({
    ...base,
    background: 'rgba(192, 57, 43, 0.08)',
    border: '1.5px solid var(--chili)',
    borderRadius: 0,
  }),
  multiValueLabel: (base: object) => ({
    ...base,
    color: 'var(--chili)',
    fontSize: '0.9rem',
    fontWeight: 600,
  }),
  multiValueRemove: (base: object) => ({
    ...base,
    color: 'var(--chili)',
  }),
  input: (base: object) => ({ ...base, color: 'var(--ink)' }),
  placeholder: (base: object) => ({ ...base, color: 'var(--muted-ink)' }),
  indicatorSeparator: () => ({ display: 'none' }),
  dropdownIndicator: (base: object) => ({ ...base, color: 'var(--chili)' }),
  clearIndicator: (base: object) => ({ ...base, color: 'var(--chili)' }),
  singleValue: (base: object) => ({ ...base, color: 'var(--ink)' }),
};

export function MultiSelectDropdown({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  'data-testid': testId,
}: MultiSelectDropdownProps) {
  const selected = options.filter((o) => value.includes(o.value));
  const handleChange = (newValue: MultiValue<MultiSelectDropdownOption>) => {
    onChange((newValue ?? []).map((o) => o.value));
  };
  return (
    <Select<MultiSelectDropdownOption, true>
      isMulti
      isSearchable
      options={options}
      value={selected}
      onChange={handleChange}
      placeholder={placeholder}
      styles={customStyles}
      components={{
        MenuList: AnimatedMenuList,
        Option: AnimatedOption,
        MultiValue: AnimatedMultiValue,
      }}
      data-testid={testId}
      classNamePrefix="multi-select"
    />
  );
}
