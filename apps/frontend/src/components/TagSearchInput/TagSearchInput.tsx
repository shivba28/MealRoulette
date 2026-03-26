import { useCallback, useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

export interface TagSearchInputProps {
  options: string[];
  value: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  'data-testid'?: string;
}

export function TagSearchInput({
  options,
  value,
  onChange,
  placeholder = 'Search…',
  'data-testid': testId,
}: TagSearchInputProps) {
  const [query, setQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const normalizedQuery = query.trim().toLowerCase();
  const suggestions = options.filter(
    (opt) =>
      !value.includes(opt) &&
      opt.toLowerCase().includes(normalizedQuery)
  );
  const limited = suggestions.slice(0, 10);
  const showSuggestions = open && query.length > 0;

  useEffect(() => {
    if (showSuggestions && limited.length > 0 && suggestionsRef.current) {
      gsap.fromTo(
        suggestionsRef.current,
        { opacity: 0, y: -6, scaleY: 0.96, transformOrigin: 'top center' },
        { opacity: 1, y: 0, scaleY: 1, duration: 0.2, ease: 'power2.out' }
      );
    }
  }, [showSuggestions, limited.length]);

  const add = useCallback(
    (item: string) => {
      if (value.includes(item)) return;
      onChange([...value, item]);
      setQuery('');
      setHighlightIndex(0);
      setOpen(false);
      inputRef.current?.focus();
    },
    [value, onChange]
  );

  const remove = useCallback(
    (item: string) => {
      onChange(value.filter((x) => x !== item));
    },
    [value, onChange]
  );

  const handleRemoveTag = useCallback(
    (tag: string, el: HTMLSpanElement | null) => {
      if (!el) {
        onChange(value.filter((t) => t !== tag));
        return;
      }
      gsap.to(el, {
        scale: 0,
        opacity: 0,
        duration: 0.18,
        ease: 'power2.in',
        onComplete: () => onChange(value.filter((t) => t !== tag)),
      });
    },
    [value, onChange]
  );

  const tagRef = useCallback((node: HTMLSpanElement | null) => {
    if (node) {
      gsap.fromTo(
        node,
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.25, ease: 'back.out(2.5)' }
      );
    }
  }, []);

  const handlePillMouseEnter = useCallback((e: React.MouseEvent<HTMLElement>) => {
    gsap.to(e.currentTarget, { x: 4, duration: 0.15, ease: 'power1.out' });
  }, []);
  const handlePillMouseLeave = useCallback((e: React.MouseEvent<HTMLElement>) => {
    gsap.to(e.currentTarget, { x: 0, duration: 0.15, ease: 'power1.out' });
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Backspace' && !query && value.length > 0) {
        remove(value[value.length - 1]!);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIndex((i) => (i + 1) % Math.max(1, limited.length));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex((i) =>
          i <= 0 ? Math.max(0, limited.length - 1) : i - 1
        );
        return;
      }
      if (e.key === 'Enter' && limited.length > 0) {
        e.preventDefault();
        add(limited[highlightIndex]!);
        return;
      }
    },
    [query, value, limited, highlightIndex, add, remove]
  );

  return (
    <div className="tag-search-input" data-testid={testId}>
      {value.length > 0 && (
        <div className="tag-search-input__tags">
          {value.map((item) => (
            <span key={item} ref={tagRef} className="tag-search-input__pill">
              {item}
              <button
                type="button"
                onClick={(e) =>
                  handleRemoveTag(item, (e.currentTarget as HTMLElement).closest('span'))
                }
                className="tag-search-input__remove"
                aria-label={`Remove ${item}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setHighlightIndex(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="tag-search-input__input"
      />
      {showSuggestions && limited.length > 0 && (
        <div ref={suggestionsRef} className="tag-search-input__suggestions">
          <ul ref={listRef} className="tag-search-input__list" role="listbox">
            {limited.map((item, i) => (
              <li
                key={item}
                role="option"
                aria-selected={i === highlightIndex}
                className={`tag-search-input__suggestion ${i === highlightIndex ? 'tag-search-input__suggestion--active' : ''}`}
                onMouseEnter={handlePillMouseEnter}
                onMouseLeave={handlePillMouseLeave}
                onMouseDown={(e) => {
                  e.preventDefault();
                  add(item);
                }}
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
