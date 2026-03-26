/**
 * Sticky bottom bar showing today's macro progress. Collapsed (56px) or expanded (~280px).
 * GSAP for entrance and expand/collapse.
 */

import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { getTodayMacroLog } from '@/services/macroLog';
import type { LoggedMeal } from '@/services/macroLog';
import { calculateStreak } from '@/utils/streakUtils';

export interface MacroTargets {
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

export interface MacroTrackerBarRef {
  addMeal: (meal: LoggedMeal) => void;
}

export interface MacroTrackerBarProps {
  targets: MacroTargets;
  ref?: React.Ref<MacroTrackerBarRef | null>;
}

const BAR_COLORS: Record<keyof MacroTargets, string> = {
  protein: 'var(--chili)',
  carbs: 'var(--saffron)',
  fat: 'var(--turmeric)',
  calories: 'var(--herb)',
};

export const MacroTrackerBar = React.forwardRef<MacroTrackerBarRef | null, MacroTrackerBarProps>(
  function MacroTrackerBar({ targets }, ref) {
    const barRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const fillRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [expanded, setExpanded] = useState(false);
    const [log, setLog] = useState<{ meals: LoggedMeal[] }>(() => {
      const today = getTodayMacroLog();
      return { meals: today.meals };
    });
    const [streak, setStreak] = useState(0);

    const consumed = log.meals.reduce(
      (acc, m) => ({
        protein: acc.protein + m.protein,
        carbs: acc.carbs + m.carbs,
        fat: acc.fat + m.fat,
        calories: acc.calories + m.calories,
      }),
      { protein: 0, carbs: 0, fat: 0, calories: 0 }
    );

    useImperativeHandle(ref, () => ({
      addMeal(meal: LoggedMeal) {
        // Caller (e.g. RecipeResultCard) already appended to localStorage; only update UI state.
        setLog((prev) => ({ meals: [meal, ...prev.meals] }));
        setStreak(calculateStreak());
      },
    }), []);

    useEffect(() => {
      setLog(() => {
        const today = getTodayMacroLog();
        return { meals: today.meals };
      });
      setStreak(calculateStreak());
    }, []);

    useEffect(() => {
      if (!barRef.current) return;
      gsap.fromTo(
        barRef.current,
        { y: 56, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' }
      );
    }, []);

    useEffect(() => {
      if (!panelRef.current) return;
      if (expanded) {
        // Animate to natural content height (avoid inner scrollbars).
        const panel = panelRef.current;
        const expandedEl = panel.querySelector<HTMLElement>('.macro-tracker-bar__expanded');
        const collapsedEl = panel.querySelector<HTMLElement>('.macro-tracker-bar__collapsed');
        const collapsedH = collapsedEl?.offsetHeight ?? 56;
        const expandedH = expandedEl?.scrollHeight ?? 0;

        // Keep within viewport so the fixed bar doesn't run off-screen.
        // User expectation: expanded panel height should land at ~400px.
        const maxPanelH = Math.max(collapsedH, window.innerHeight - 12);
        const naturalTargetH = collapsedH + expandedH;
        const targetH = Math.min(maxPanelH, Math.max(400, naturalTargetH));

        gsap.to(panel, { height: targetH, duration: 0.35, ease: 'power2.out' });
      } else {
        gsap.to(panelRef.current, { height: 56, duration: 0.3, ease: 'power2.in' });
      }
    }, [expanded]);

    useEffect(() => {
      const keys: (keyof MacroTargets)[] = ['protein', 'carbs', 'fat', 'calories'];
      keys.forEach((key, i) => {
        const el = fillRefs.current[i];
        if (!el) return;
        const target = targets[key];
        const value = target > 0 ? Math.min(100, (consumed[key] / target) * 100) : 0;
        gsap.to(el, { width: `${value}%`, duration: 0.6, ease: 'power2.out' });
      });
    }, [consumed, targets]);

    const toggle = useCallback(() => setExpanded((e) => !e), []);
    const close = useCallback(() => setExpanded(false), []);

    useEffect(() => {
      if (!expanded) return;
      const onMouseDown = (e: MouseEvent) => {
        if (barRef.current && !barRef.current.contains(e.target as Node)) {
          close();
        }
      };
      document.addEventListener('mousedown', onMouseDown);
      return () => document.removeEventListener('mousedown', onMouseDown);
    }, [expanded, close]);

    const pillConfig = [
      { key: 'protein' as const, label: 'P', unit: 'g' },
      { key: 'carbs' as const, label: 'C', unit: 'g' },
      { key: 'fat' as const, label: 'F', unit: 'g' },
      { key: 'calories' as const, label: 'Cal', unit: '' },
    ];
    const barLabels = { protein: 'Protein', carbs: 'Carbs', fat: 'Fat', calories: 'Calories' };

    return (
      <div
        ref={barRef}
        className="macro-tracker-bar"
        style={{
          position: 'fixed',
          bottom: 'env(safe-area-inset-bottom, 0px)',
          left: 0,
          right: 0,
          zIndex: 40,
          background: 'var(--paper)',
          borderTop: '2px solid var(--ink)',
        }}
      >
        <div
          ref={panelRef}
          style={{ height: 56, overflow: 'hidden' }}
          className="macro-tracker-bar__panel tracker-panel"
        >
          <button
            type="button"
            onClick={toggle}
            className="macro-tracker-bar__collapsed tracker-collapsed"
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse macro tracker' : 'Expand macro tracker'}
          >
            <div className="macro-tracker-bar__pills tracker-totals">
              {pillConfig.map(({ key, label, unit }) => {
                const c = consumed[key];
                const t = targets[key];
                return (
                  <div key={key} className="macro-tracker-bar__pill tracker-macro">
                    {label}: {c}{unit}<span> / {t}{unit}</span>
                  </div>
                );
              })}
            </div>
            <span className="macro-tracker-bar__chevron">
              {expanded ? '▼ close' : '▲ open'}
            </span>
          </button>

          <div className="macro-tracker-bar__expanded tracker-expanded">
            {streak >= 1 && (
              <div className="macro-tracker-bar__streak-line">
                <span className="streak">🔥 {streak} day streak</span>
                <span className="macro-tracker-bar__meals-today">
                  {log.meals.length} meals logged today
                </span>
              </div>
            )}
            {(['protein', 'carbs', 'fat', 'calories'] as const).map((key, i) => {
              const c = consumed[key];
              const t = targets[key];
              const pct = t > 0 ? Math.min(100, (c / t) * 100) : 0;
              const valueStr = key === 'calories' ? `${c} / ${t} kcal` : `${c} / ${t}g`;
              return (
                <div key={key} className="macro-tracker-bar__row bar-row">
                  <div className="bar-label">
                    <span>{barLabels[key]}</span>
                    <span className="macro-tracker-bar__row-value">{valueStr}</span>
                  </div>
                  <div className="macro-tracker-bar__track bar-track">
                    <div
                      ref={(el) => { fillRefs.current[i] = el; }}
                      className="macro-tracker-bar__fill bar-fill"
                      style={{
                        width: `${pct}%`,
                        background: BAR_COLORS[key],
                      }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="macro-tracker-bar__meals">
              <div className="macro-tracker-bar__meals-title sec-label">Meals today</div>
              {log.meals.length === 0 ? (
                <>
                  <p className="macro-tracker-bar__meals-empty">No meals logged yet</p>
                  <p className="annotation" style={{ marginTop: 6 }}>
                    tap &quot;Made It ✓&quot; on any recipe to log it here
                  </p>
                </>
              ) : (
                <>
                  {log.meals.map((m, i) => (
                    <div
                      key={`${m.recipeId}-${m.loggedAt}-${i}`}
                      className="macro-tracker-bar__meal meal-logged"
                    >
                      <span className="macro-tracker-bar__meal-name meal-name">{m.recipeName}</span>
                      <span className="tag" style={{ fontSize: 20, padding: '1px 7px' }}>
                        {m.calories} kcal
                      </span>
                      <span className="meal-time">
                        {new Date(m.loggedAt).toLocaleTimeString([], {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);
