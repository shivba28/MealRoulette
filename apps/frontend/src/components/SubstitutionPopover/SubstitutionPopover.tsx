/**
 * Popover showing Groq-powered ingredient substitute. Trigger: small "?" button.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { fetchSubstitution } from '@/services/substitution';

export interface SubstitutionPopoverProps {
  recipeName: string;
  ingredientName: string;
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  onUseSubstitute: (substitute: string) => void;
}

export function SubstitutionPopover({
  recipeName,
  ingredientName,
  anchorRef,
  open,
  onClose,
  onUseSubstitute,
}: SubstitutionPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'result' | 'error'>('idle');
  const [result, setResult] = useState<{ substitute: string; reason: string } | null>(null);

  const runFetch = useCallback(() => {
    setState('loading');
    setResult(null);
    fetchSubstitution(recipeName, ingredientName)
      .then((data) => {
        if (data) {
          setResult(data);
          setState('result');
        } else {
          setState('error');
        }
      })
      .catch(() => setState('error'));
  }, [recipeName, ingredientName]);

  useEffect(() => {
    if (open && state === 'idle') runFetch();
  }, [open, state, runFetch]);

  useEffect(() => {
    if (!open) {
      setState('idle');
      setResult(null);
      return;
    }
    const el = popoverRef.current;
    if (!el) return;
    gsap.fromTo(
      el,
      { scale: 0.9, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.2, ease: 'back.out(1.5)', transformOrigin: 'top left' }
    );
    return () => {
      gsap.to(el, { scale: 0.9, opacity: 0, duration: 0.15 });
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return (
    <div
      ref={popoverRef}
      className="substitution-popover"
      role="dialog"
      aria-label="Ingredient substitution"
    >
      <div className="sub-popover">
        <div className="sub-inner">
          {state === 'loading' && (
            <div className="substitution-popover__loading">
              <span className="substitution-popover__spinner" aria-hidden />
              <span className="substitution-popover__loading-text">Finding a substitute…</span>
            </div>
          )}
          {state === 'result' && result && (
            <>
              <div className="sec-label">Substitute</div>
              <div className="sub-ingredient">{ingredientName}</div>
              <span className="sub-arrow">↓</span>
              <div className="sub-suggest">
                <div className="sub-suggest-name">{result.substitute}</div>
                <div className="sub-reason">{result.reason}</div>
              </div>
              <div className="sub-actions">
                <button
                  type="button"
                  className="btn-use"
                  onClick={() => {
                    onUseSubstitute(result.substitute);
                    onClose();
                  }}
                >
                  Use this ✓
                </button>
                <button type="button" className="btn-cancel" onClick={onClose}>
                  Cancel
                </button>
              </div>
            </>
          )}
          {state === 'error' && (
            <>
              <div className="sec-label">Substitute</div>
              <div className="sub-ingredient">{ingredientName}</div>
              <p className="substitution-popover__error">Couldn&apos;t find a substitute</p>
              <div className="sub-actions">
                <button type="button" className="substitution-popover__retry" onClick={runFetch}>
                  Retry
                </button>
                <button type="button" className="btn-cancel" onClick={onClose}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
