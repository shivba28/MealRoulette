import { useCallback, useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { RouletteView } from '@/components/RouletteView';
import { PreferencesForm } from '@/components/PreferencesForm';
import type { PreferencesFormRef } from '@/components/PreferencesForm';
import { HeroPanel } from '@/components/HeroPanel';
import { AppHeader } from '@/components/AppHeader';
import { HistoryBookmark } from '@/components/HistoryBookmark';
import { MacroTrackerBar } from '@/components/MacroTrackerBar';
import type { MacroTrackerBarRef } from '@/components/MacroTrackerBar';
import { HistoryPanel } from '@/components/HistoryPanel';
import { useMacroPreferenceStore } from '@/state/macroPreferenceStore';
import { useUserProfileStore } from '@/state/userProfileStore';
import { flushSwipeQueue } from '@/services/analytics';
import { getTodayMacroLog } from '@/services/macroLog';
import type { LoggedMeal } from '@/services/macroLog';
import { calculateStreak } from '@/utils/streakUtils';
import { PullCord } from '@/components/PullCord/PullCord';
import type { PullCordHandle } from '@/components/PullCord/PullCord';

const VISITED_KEY = 'meal-roulette-visited';

function App() {
  const loadFromStorage = useMacroPreferenceStore((s) => s.loadFromStorage);
  const loadProfileFromStorage = useUserProfileStore((s) => s.loadFromStorage);
  const proteinTarget = useMacroPreferenceStore((s) => s.proteinTarget);
  const carbsTarget = useMacroPreferenceStore((s) => s.carbsTarget);
  const fatTarget = useMacroPreferenceStore((s) => s.fatTarget);
  const calorieCap = useMacroPreferenceStore((s) => s.calorieCap ?? 2200);
  const maxCookTimeMinutes = useMacroPreferenceStore((s) => s.maxCookTimeMinutes);
  const preferredIngredients = useMacroPreferenceStore((s) => s.preferredIngredients ?? []);
  const [hasEntered, setHasEntered] = useState(false);
  const [formCollapsed, setFormCollapsed] = useState(true);
  const [rouletteKey, setRouletteKey] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [logVersion, setLogVersion] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);
  const historyBookmarkRef = useRef<HTMLButtonElement | null>(null);
  const macroTrackerRef = useRef<MacroTrackerBarRef | null>(null);
  const prefsFormRef = useRef<PreferencesFormRef | null>(null);
  const prefsWrapperRef = useRef<HTMLDivElement>(null);
  const prefsScreenRef = useRef<HTMLDivElement>(null);
  const prefsRollerBarRef = useRef<HTMLDivElement>(null);
  const pullCordRef = useRef<PullCordHandle | null>(null);
  const prefsPullingRef = useRef(false);
  const prefsOpenHeightRef = useRef<number | null>(null);

  const todayLog = getTodayMacroLog();
  const historyCount = todayLog.meals.length;
  const streak = calculateStreak();
  void logVersion; // used to trigger re-render when a meal is logged

  useEffect(() => {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(VISITED_KEY)) {
      setHasEntered(true);
    }
  }, []);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);
  useEffect(() => {
    loadProfileFromStorage();
  }, [loadProfileFromStorage]);

  useEffect(() => {
    const onOnline = () => void flushSwipeQueue();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  // Keep the history bookmark slide perfectly synced with the panel GSAP timing.
  useEffect(() => {
    const el = historyBookmarkRef.current;
    if (!el) return;
    // Keep in sync with CSS: panel is full width on <= 767px, otherwise max 500px.
    const panelW =
      window.innerWidth <= 767 ? window.innerWidth : Math.min(500, window.innerWidth);
    const targetShift = historyOpen ? `-${panelW + 0}px` : '0px';
    gsap.killTweensOf(el);
    gsap.to(el, {
      duration: 0.4,
      ease: historyOpen ? 'power2.out' : 'power2.inOut',
      '--bookmark-shift': targetShift,
      right: window.innerWidth <= 767 ? (historyOpen ? '-30px' : '0px') : '0px',
    } as any);
    gsap.to(".history-bookmark__icon-wrap", { duration: 0.4, ease: 'power2.inOut', top: historyOpen ? '-10px' : '0px' });
  }, [historyOpen]);

  const handleEnter = useCallback(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(VISITED_KEY, '1');
    }
    const el = heroRef.current;
    if (el) {
      gsap.to(el, {
        opacity: 0,
        y: -40,
        duration: 0.6,
        ease: 'power2.in',
        onComplete: () => setHasEntered(true),
      });
    } else {
      setHasEntered(true);
    }
  }, []);

  const handleEditPreferences = useCallback(async () => {
    if (formCollapsed) {
      setFormCollapsed(false);
      setRouletteKey((k) => k + 1);
    } else {
      await prefsFormRef.current?.save();
      setFormCollapsed(true);
    }
  }, [formCollapsed]);

  const measurePrefsOpenHeight = useCallback(() => {
    const wrapper = prefsWrapperRef.current;
    if (!wrapper) return 0;
    const viaScroll = wrapper.scrollHeight;
    if (viaScroll > 0) return viaScroll;
    // Fallback for edge cases where scrollHeight is 0.
    gsap.set(wrapper, { maxHeight: 5000, overflow: 'hidden' });
    const h = wrapper.offsetHeight;
    return h;
  }, []);

  const applyPrefsPullPreview = useCallback(
    (progress: number) => {
      const wrapper = prefsWrapperRef.current;
      const screen = prefsScreenRef.current;
      const bar = prefsRollerBarRef.current;
      if (!wrapper) return;

      const openHeight = prefsOpenHeightRef.current ?? measurePrefsOpenHeight();
      prefsOpenHeightRef.current = openHeight;

      const clamped = Math.max(0, Math.min(1, progress));
      const h = openHeight * clamped;

      gsap.killTweensOf([wrapper, screen, bar].filter(Boolean));
      gsap.set(wrapper, { maxHeight: h, overflow: 'hidden' });
      if (screen) gsap.set(screen, { scaleY: clamped, transformOrigin: 'top center' });
      if (bar) gsap.set(bar, { y: 0 });
    },
    [measurePrefsOpenHeight]
  );

  const handlePrefsPullProgress = useCallback(
    (progress: number) => {
      if (!formCollapsed) return; // only when closed
      prefsPullingRef.current = true;
      applyPrefsPullPreview(progress);
    },
    [applyPrefsPullPreview, formCollapsed]
  );

  const handlePrefsPullEnd = useCallback(
    (progress: number) => {
      if (!formCollapsed) return; // only when closed
      prefsPullingRef.current = false;

      const openThreshold = 0.2;
      if (progress >= openThreshold) {
        // Open fully (the open animation effect will take over from the current partial state).
        setFormCollapsed(false);
        setRouletteKey((k) => k + 1);
        return;
      }

      // Snap shut
      const wrapper = prefsWrapperRef.current;
      const screen = prefsScreenRef.current;
      const bar = prefsRollerBarRef.current;
      gsap.to(wrapper, { maxHeight: 0, duration: 0.2, ease: 'power2.in', overflow: 'hidden' });
      if (screen) gsap.to(screen, { scaleY: 0, duration: 0.2, ease: 'power2.in', transformOrigin: 'top center' });
      if (bar) gsap.to(bar, { y: 0, duration: 0.1, ease: 'power2.in' });
    },
    [formCollapsed]
  );

  const handleAddMeal = useCallback((meal: LoggedMeal) => {
    macroTrackerRef.current?.addMeal(meal);
    setLogVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    const wrapper = prefsWrapperRef.current;
    const screen = prefsScreenRef.current;
    const bar = prefsRollerBarRef.current;
    if (!wrapper) return;
    if (prefsPullingRef.current) return;
    const expandedHeight = 5000;
    if (formCollapsed) {
      if (screen) gsap.to(screen, { scaleY: 0, duration: 0.28, ease: 'power2.in', transformOrigin: 'top center' });
      gsap.to(wrapper, { maxHeight: 0, duration: 0.3, ease: 'power2.in', overflow: 'hidden', delay: 0.02 });
      if (bar) gsap.to(bar, { y: 0, duration: 0.3, ease: 'power2.in', delay: 0.02 });
    } else {
      // Measure wrapper height when expanded so animations can run to the real height.
      gsap.set(wrapper, { maxHeight: expandedHeight, overflow: 'hidden' });
      const openHeight = wrapper.offsetHeight || wrapper.scrollHeight;
      prefsOpenHeightRef.current = openHeight;

      // Start from whatever state we're currently in (e.g. partially open from a pull).
      const currentH = wrapper.offsetHeight;
      const currentScale = screen ? (gsap.getProperty(screen, 'scaleY') as number) : 0;

      gsap.set(wrapper, { maxHeight: currentH, overflow: 'hidden' });
      if (screen) gsap.set(screen, { scaleY: currentScale, transformOrigin: 'top center' });
      if (bar) gsap.set(bar, { y: 0 });

      const openDuration = 0.3;
      const openEase = 'power2.out';
      gsap.to(wrapper, { maxHeight: openHeight, duration: openDuration, ease: openEase, overflow: 'hidden' });
      if (bar) gsap.to(bar, { y: 0, duration: openDuration, ease: openEase });
      if (screen) {
        gsap.to(screen, {
          scaleY: 1,
          duration: 0.42,
          ease: 'back.out(1.2)',
          transformOrigin: 'top center',
          delay: 0.02,
          onComplete: () => {
            pullCordRef.current?.bounce();
          },
        });
      }
    }
  }, [formCollapsed]);

  if (!hasEntered) {
    return (
      <div ref={heroRef}>
        <HeroPanel onEnter={handleEnter} />
      </div>
    );
  }

  return (
    <>
      <AppHeader showEditPreferences={false} streak={streak} />
      <HistoryBookmark
        ref={historyBookmarkRef}
        count={historyCount}
        historyOpen={historyOpen}
        onClick={() => setHistoryOpen((v) => !v)}
      />
      <div className="wrap">
        <div className="main-layout">
          <div className="prefs-summary">
            <div className="prefs-summary__content">
              <div className="prefs-summary__cols">
                <div className="prefs-summary__col prefs-summary__col--targets">
                  <div className="sec-label">Current targets</div>
                  <div className="prefs-row">
                    <span className="macro-pill">P: {proteinTarget}g</span>
                    <span className="macro-pill">C: {carbsTarget}g</span>
                    <span className="macro-pill">F: {fatTarget}g</span>
                    <span className="macro-pill">≤ {calorieCap} kcal</span>
                    <span className="macro-pill">
                      ≤ {maxCookTimeMinutes == null || maxCookTimeMinutes === 60 ? '1 hr+' : `${maxCookTimeMinutes} min`}
                    </span>
                  </div>
                </div>

                {preferredIngredients.length > 0 && (
                  <div className="prefs-summary__col prefs-summary__col--ingredients">
                    <div className="sec-label">Ingredients</div>
                    <div className="prefs-row prefs-summary__ingredients-list">
                      {preferredIngredients.map((ing) => (
                        <span key={ing} className="tag herb-tag">
                          {ing}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="prefs-summary__action">
              <button
                type="button"
                onClick={handleEditPreferences}
                className="hbtn"
                aria-label={formCollapsed ? 'Edit preferences' : 'Roll up preferences'}
              >
                {formCollapsed ? 'Edit prefs' : '▲ Close prefs'}
              </button>
            </div>
          </div>

          <div className="app__preferences-roller">
            <div
              ref={prefsWrapperRef}
              className="app__preferences-wrapper"
              aria-hidden={formCollapsed}
            >
              <div ref={prefsScreenRef} className="app__preferences-screen">
                <PreferencesForm ref={prefsFormRef} />
              </div>
            </div>
            <div ref={prefsRollerBarRef} className="app__preferences-roller-bar" aria-hidden />
          </div>
          <div className="app__pull-cord-wrap">
            <PullCord
              ref={pullCordRef}
              isOpen={!formCollapsed}
              onToggle={handleEditPreferences}
              // Pull-to-preview only when closed; keep tug-to-close when open.
              tugThreshold={formCollapsed ? 9999 : 50}
              onPullProgress={handlePrefsPullProgress}
              onPullEnd={handlePrefsPullEnd}
            />
          </div>
          <RouletteView key={rouletteKey} onAddMeal={handleAddMeal} />
        </div>
      </div>
      <MacroTrackerBar
        ref={macroTrackerRef}
        targets={{
          protein: proteinTarget,
          carbs: carbsTarget,
          fat: fatTarget,
          calories: calorieCap,
        }}
      />
      <HistoryPanel isOpen={historyOpen} onClose={() => setHistoryOpen(false)} />
    </>
  );
}

export { App };
