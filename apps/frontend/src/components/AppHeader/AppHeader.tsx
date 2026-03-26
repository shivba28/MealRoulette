/**
 * Minimal sticky header shown after hero is dismissed.
 * Dices + title (and optional streak); right: Edit Preferences when enabled.
 */

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
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

  useEffect(() => {
    if (!headerRef.current) return;
    gsap.fromTo(
      headerRef.current,
      { y: -60, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }
    );
  }, []);

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
