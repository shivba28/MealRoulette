/**
 * Minimal sticky header shown after hero is dismissed.
 * Dices + title (and optional streak); right: Edit Preferences when enabled.
 */

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { MacroSliderInput } from '@/components/MacroSliderInput';
import { useMacroPreferenceStore } from '@/state/macroPreferenceStore';
export interface AppHeaderProps {
  onEditPreferences?: () => void;
  showEditPreferences?: boolean;
  /** When true, preferences panel is open (e.g. show "Roll up" or keep "Edit Preferences"). */
  preferencesOpen?: boolean;
  streak?: number;
}

export function AppHeader({
  onEditPreferences,
  showEditPreferences = false,
  preferencesOpen = false,
}: AppHeaderProps) {
  const headerRef = useRef<HTMLElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dailyLimitsOpen, setDailyLimitsOpen] = useState(false);
  const [dailyLimitsVisible, setDailyLimitsVisible] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  const setDailyProteinTarget = useMacroPreferenceStore((s) => s.setDailyProteinTarget);
  const setDailyCarbsTarget = useMacroPreferenceStore((s) => s.setDailyCarbsTarget);
  const setDailyFatTarget = useMacroPreferenceStore((s) => s.setDailyFatTarget);
  const setDailyCalorieTarget = useMacroPreferenceStore((s) => s.setDailyCalorieTarget);
  const persistToStorage = useMacroPreferenceStore((s) => s.persistToStorage);
  const proteinTarget = useMacroPreferenceStore((s) => s.proteinTarget);
  const carbsTarget = useMacroPreferenceStore((s) => s.carbsTarget);
  const fatTarget = useMacroPreferenceStore((s) => s.fatTarget);
  const calorieCap = useMacroPreferenceStore((s) => s.calorieCap ?? 733);
  const dailyProteinTarget = useMacroPreferenceStore((s) => s.dailyProteinTarget);
  const dailyCarbsTarget = useMacroPreferenceStore((s) => s.dailyCarbsTarget);
  const dailyFatTarget = useMacroPreferenceStore((s) => s.dailyFatTarget);
  const dailyCalorieTarget = useMacroPreferenceStore((s) => s.dailyCalorieTarget);

  useEffect(() => {
    if (!headerRef.current) return;
    gsap.fromTo(
      headerRef.current,
      { y: -60, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }
    );
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const openDailyLimits = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setDailyLimitsVisible(true);
    setDailyLimitsOpen(true);
  };

  const closeDailyLimits = () => {
    setDailyLimitsOpen(false);
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => {
      setDailyLimitsVisible(false);
      closeTimerRef.current = null;
    }, 220);
  };

  useEffect(() => {
    if (!dailyLimitsOpen) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!dropdownRef.current) return;
      const target = e.target as Node | null;
      if (target && !dropdownRef.current.contains(target)) {
        closeDailyLimits();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [dailyLimitsOpen]);

  return (
    <header
      ref={headerRef}
      className="app-header sticky top-0 z-50"
    >
      <div className="logo-block">
        <div className="logo-sq">MR</div>
        <div className="app-name">Meal Roulette</div>
      </div>

      <div className="header-actions">
        {/* {streak >= 1 && <span className="streak">🔥 {streak}</span>} */}
        <div className="header-daily-limits" ref={dropdownRef}>
          <button
            type="button"
            className="hbtn"
            onClick={() => {
              if (dailyLimitsOpen) closeDailyLimits();
              else openDailyLimits();
            }}
            aria-expanded={dailyLimitsOpen}
            aria-haspopup="dialog"
            aria-label="Toggle daily limits"
          >
            {dailyLimitsOpen ? '▲ Daily limits' : 'Daily limits'}
          </button>
          {dailyLimitsVisible && (
            <div
              className={`header-daily-limits__dropdown ${dailyLimitsOpen ? '' : 'header-daily-limits__dropdown--closing'}`}
              role="dialog"
              aria-label="Daily limits"
            >
              <div className="header-daily-limits__grid">
                <div className="macro-field">
                  <MacroSliderInput
                    label="Daily Protein"
                    min={0}
                    max={900}
                    step={10}
                    unit="g"
                    value={dailyProteinTarget ?? proteinTarget * 3}
                    onChange={(v) => {
                      setDailyProteinTarget(v);
                      void persistToStorage();
                    }}
                    data-testid="header-daily-protein"
                  />
                </div>
                <div className="macro-field">
                  <MacroSliderInput
                    label="Daily Carbs"
                    min={0}
                    max={900}
                    step={10}
                    unit="g"
                    value={dailyCarbsTarget ?? carbsTarget * 3}
                    onChange={(v) => {
                      setDailyCarbsTarget(v);
                      void persistToStorage();
                    }}
                    data-testid="header-daily-carbs"
                  />
                </div>
                <div className="macro-field">
                  <MacroSliderInput
                    label="Daily Fat"
                    min={0}
                    max={500}
                    step={5}
                    unit="g"
                    value={dailyFatTarget ?? fatTarget * 3}
                    onChange={(v) => {
                      setDailyFatTarget(v);
                      void persistToStorage();
                    }}
                    data-testid="header-daily-fat"
                  />
                </div>
                <div className="macro-field">
                  <MacroSliderInput
                    label="Daily Calories"
                    min={0}
                    max={8000}
                    step={50}
                    unit="kcal"
                    value={dailyCalorieTarget ?? calorieCap * 3}
                    onChange={(v) => {
                      setDailyCalorieTarget(v);
                      void persistToStorage();
                    }}
                    data-testid="header-daily-calories"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        {showEditPreferences && onEditPreferences && (
          <button
            type="button"
            onClick={onEditPreferences}
            className="hbtn"
            aria-label={preferencesOpen ? 'Roll up preferences' : 'Edit preferences'}
          >
            {preferencesOpen ? '▲ Close prefs' : 'Edit prefs'}
          </button>
        )}
      </div>
    </header>
  );
}
