/**
 * Slide-in panel from the right showing all meals logged via "Made It ✓".
 * Grouped by date, with streak and macro breakdown per meal.
 */

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { getAllMacroLogKeys, getMacroLogByKey } from '@/services/macroLog';
import type { LoggedMeal } from '@/services/macroLog';
import { calculateStreak } from '@/utils/streakUtils';

export interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatDateKey(key: string): string {
  const dateStr = key.replace('macro-log-', '');
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  const d = new Date(dateStr + 'T12:00:00Z');
  const shortDate = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (dateStr === today) return `Today — ${shortDate}`;
  if (dateStr === yesterdayStr) return `Yesterday — ${shortDate}`;
  return shortDate;
}

export function HistoryPanel({ isOpen, onClose }: HistoryPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(isOpen);
  const [groups, setGroups] = useState<Array<{ dateLabel: string; meals: LoggedMeal[] }>>([]);
  const [streak, setStreak] = useState(0);

  // Render immediately when opening, but keep mounted long enough to animate out.
  const shouldRender = isOpen || rendered;

  useEffect(() => {
    if (isOpen) setRendered(true);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    // Defer list building so the panel slide starts without a JS-thread hiccup.
    // Use `setTimeout(0)` rather than `requestAnimationFrame` so tests + older environments behave consistently.
    const t = window.setTimeout(() => {
      if (cancelled) return;
      const keys = getAllMacroLogKeys();
      const next: Array<{ dateLabel: string; meals: LoggedMeal[] }> = [];
      keys.forEach((key) => {
        const log = getMacroLogByKey(key);
        if (log && log.meals.length > 0) {
          next.push({ dateLabel: formatDateKey(key), meals: log.meals });
        }
      });
      setGroups(next);
      setStreak(calculateStreak());
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [isOpen]);

  useEffect(() => {
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (!panel) return;
    const offscreen = panel.getBoundingClientRect().width;

    gsap.killTweensOf(panel);
    if (backdrop) gsap.killTweensOf(backdrop);

    if (isOpen) {
      gsap.fromTo(panel, { x: offscreen }, { x: 0, duration: 0.4, ease: 'power2.out' });
      if (backdrop) gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 0.4, duration: 0.4, ease: 'power2.out' });
    } else {
      gsap.to(panel, {
        x: offscreen,
        duration: 0.4,
        ease: 'power2.inOut',
        onComplete: () => setRendered(false),
      });
      if (backdrop) gsap.to(backdrop, { opacity: 0, duration: 0.4, ease: 'power2.out' });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [isOpen, onClose]);

  if (!shouldRender) return null;

  return (
    <>
      <div
        ref={backdropRef}
        className="history-panel__backdrop"
        aria-hidden
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="history-panel history-panel__hist-panel"
        role="dialog"
        aria-label="Meal history"
      >
        <div className="history-panel__content">
          <div className="hist-nb" aria-hidden />
          <div className="hist-margin" aria-hidden />
          <div className="hist-inner">
            <div className="hist-header">
              <h2 className="hist-title">Meal History</h2>
              {streak >= 1 && <span className="streak">🔥 {streak} day streak</span>}
            </div>
            {groups.length === 0 ? (
              <div className="history-panel__empty">
                <span className="history-panel__empty-emoji" aria-hidden>🍽️</span>
                <p className="history-panel__empty-text">No meals logged yet</p>
                <p className="history-panel__empty-sub">Spin the wheel to get started</p>
              </div>
            ) : (
              <>
                {groups.map((group) => (
                  <div key={group.dateLabel} className="day-group">
                    <div className="day-label">{group.dateLabel}</div>
                    {group.meals.map((m, i) => (
                      <div
                        key={`${m.recipeId}-${m.loggedAt}-${i}`}
                        className="hist-meal"
                      >
                        <div style={{ flex: 1 }}>
                          <div className="hist-meal-name">{m.recipeName}</div>
                          <div className="hist-pills">
                            <span className="tag" style={{ fontSize: 20, padding: '1px 7px' }}>
                              {m.calories} kcal
                            </span>
                            <span className="tag" style={{ fontSize: 20, padding: '1px 7px' }}>
                              {m.protein}g P
                            </span>
                          </div>
                        </div>
                        <span className="meal-time">
                          {new Date(m.loggedAt).toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
                <p className="annotation" style={{ marginTop: 8 }}>
                  all meals saved locally, no account needed
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
