import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { RouletteView } from '@/components/RouletteView';
import { PreferencesForm } from '@/components/PreferencesForm';
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
import { CloudBackupMenu } from '@/components/CloudBackupMenu';
import { PullCord } from '@/components/PullCord/PullCord';
import type { PullCordHandle } from '@/components/PullCord/PullCord';
import { DEFAULT_CALORIE_CAP_PER_MEAL } from '@mealroulette/shared-types';

const VISITED_KEY = 'meal-roulette-visited';
const DEFAULT_TRACKER_MEALS_PER_DAY = 3;

const ROULETTE_INTRO_WHEEL_SEC = 2;
/** Shared duration: wheel travels to its slot while header/prefs/macro/history slide in. */
const ROULETTE_INTRO_CHROME_SEC = 0.5;
/** One ease for every reveal tween so motion starts/ends together visually. */
const ROULETTE_INTRO_REVEAL_EASE = 'power2.out';
const ROULETTE_INTRO_REF_RETRY_MAX = 12;

function App() {
  const loadFromStorage = useMacroPreferenceStore((s) => s.loadFromStorage);
  const loadProfileFromStorage = useUserProfileStore((s) => s.loadFromStorage);
  const proteinTarget = useMacroPreferenceStore((s) => s.proteinTarget);
  const carbsTarget = useMacroPreferenceStore((s) => s.carbsTarget);
  const fatTarget = useMacroPreferenceStore((s) => s.fatTarget);
  const calorieCap = useMacroPreferenceStore((s) => s.calorieCap ?? DEFAULT_CALORIE_CAP_PER_MEAL);
  const dailyProteinTarget = useMacroPreferenceStore((s) => s.dailyProteinTarget);
  const dailyCarbsTarget = useMacroPreferenceStore((s) => s.dailyCarbsTarget);
  const dailyFatTarget = useMacroPreferenceStore((s) => s.dailyFatTarget);
  const dailyCalorieTarget = useMacroPreferenceStore((s) => s.dailyCalorieTarget);
  const maxCookTimeMinutes = useMacroPreferenceStore((s) => s.maxCookTimeMinutes);
  const preferredIngredients = useMacroPreferenceStore((s) => s.preferredIngredients ?? []);
  const [hasEntered, setHasEntered] = useState(false);
  const [formCollapsed, setFormCollapsed] = useState(true);
  const [rouletteKey, setRouletteKey] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [logVersion, setLogVersion] = useState(0);
  const [rouletteSpinChromeVisible, setRouletteSpinChromeVisible] = useState(false);
  const [rouletteSpinTitleOpaque, setRouletteSpinTitleOpaque] = useState(false);
  const [rouletteSpinTitleExpanded, setRouletteSpinTitleExpanded] = useState(false);
  const [rouletteIntroComplete, setRouletteIntroComplete] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const historyBookmarkRef = useRef<HTMLButtonElement | null>(null);
  const historyHostRef = useRef<HTMLDivElement | null>(null);
  const historyBookmarkSlideRef = useRef<HTMLDivElement | null>(null);
  const macroTrackerRef = useRef<MacroTrackerBarRef | null>(null);
  const macroTrackerDomRef = useRef<HTMLDivElement | null>(null);
  const appHeaderRef = useRef<HTMLElement | null>(null);
  const prefsChromeRef = useRef<HTMLDivElement | null>(null);
  const rouletteWheelRef = useRef<HTMLButtonElement | null>(null);
  const rouletteWheelSlotRef = useRef<HTMLDivElement | null>(null);
  const introOverlayRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const rouletteIntroPlayedRef = useRef(false);
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
    if (!rouletteIntroComplete) return;
    const el = historyBookmarkRef.current;
    const host = historyHostRef.current;
    if (!el) return;
    // Keep in sync with CSS: panel is full width on <= 767px, otherwise max 500px.
    const panelW =
      window.innerWidth <= 767 ? window.innerWidth : Math.min(500, window.innerWidth);
    const targetShift = historyOpen ? `-${panelW + 0}px` : '0px';
    const rightVal = window.innerWidth <= 767 ? (historyOpen ? '-30px' : '0px') : '0px';
    const tweenTargets: (HTMLElement | SVGElement)[] = [el];
    if (host) tweenTargets.push(host);
    gsap.killTweensOf(tweenTargets);
    gsap.to(el, {
      duration: 0.4,
      ease: historyOpen ? 'power2.out' : 'power2.inOut',
      '--bookmark-shift': targetShift,
    } as gsap.TweenVars);
    if (host) {
      gsap.to(host, {
        duration: 0.4,
        ease: historyOpen ? 'power2.out' : 'power2.inOut',
        right: rightVal,
      });
    }
    gsap.to('.history-bookmark__icon-wrap', {
      duration: 0.4,
      ease: 'power2.inOut',
      top: historyOpen ? '-10px' : '0px',
    });
  }, [historyOpen, rouletteIntroComplete]);

  useLayoutEffect(() => {
    if (!hasEntered || rouletteIntroPlayedRef.current) return;

    let cancelled = false;
    let retries = 0;

    const run = () => {
      if (cancelled || rouletteIntroPlayedRef.current) return;

      const wheel = rouletteWheelRef.current;
      const wheelSlot = rouletteWheelSlotRef.current;
      const header = appHeaderRef.current;
      const prefs = prefsChromeRef.current;
      const macro = macroTrackerDomRef.current;
      const overlay = introOverlayRef.current;
      const historyHost = historyHostRef.current;
      const historySlide = historyBookmarkSlideRef.current;
      const wrap = wrapRef.current;
      const svg = wheel?.querySelector<SVGElement>('.wsvg');

      if (!wheel || !wheelSlot || !header || !prefs || !macro || !overlay || !historyHost || !historySlide || !wrap || !svg) {
        retries += 1;
        if (retries < ROULETTE_INTRO_REF_RETRY_MAX) {
          requestAnimationFrame(run);
        } else {
          rouletteIntroPlayedRef.current = true;
          setRouletteSpinTitleOpaque(true);
          setRouletteSpinTitleExpanded(true);
          setRouletteSpinChromeVisible(true);
          setRouletteIntroComplete(true);
        }
        return;
      }

      rouletteIntroPlayedRef.current = true;
      const wheelRect = wheel.getBoundingClientRect();

      gsap.set([header, prefs], { opacity: 0, y: -48, pointerEvents: 'none' });
      gsap.set(macro, { opacity: 0, y: 72, pointerEvents: 'none' });
      gsap.set(historySlide, { opacity: 0, x: 72, pointerEvents: 'none' });
      gsap.set(wrap, { pointerEvents: 'none' });
      gsap.set(overlay, { opacity: 1, pointerEvents: 'auto' });

      gsap.set(wheel, {
        position: 'fixed',
        zIndex: 70,
        left: '50%',
        top: '50%',
        xPercent: -50,
        yPercent: -50,
        width: wheelRect.width,
        height: wheelRect.height,
        scale: 0.04,
        pointerEvents: 'none',
      });

      const revealAt = ROULETTE_INTRO_WHEEL_SEC;
      const revealEnd = ROULETTE_INTRO_WHEEL_SEC + ROULETTE_INTRO_CHROME_SEC;
      const tl = gsap.timeline({
        onComplete: () => {
          if (cancelled) return;
          setRouletteIntroComplete(true);
          [header, prefs, macro, historySlide, wheel, wrap].forEach((node) => {
            if (node) gsap.set(node, { clearProps: 'pointerEvents' });
          });
        },
      });

      tl.to(
        wheel,
        { scale: 1, duration: ROULETTE_INTRO_WHEEL_SEC, ease: 'power2.out' },
        0
      );
      tl.to(
        svg,
        {
          rotation: '+=720',
          duration: ROULETTE_INTRO_WHEEL_SEC,
          ease: 'none',
          transformOrigin: '50% 50%',
        },
        0
      );

      tl.call(() => {
        if (!cancelled) setRouletteSpinTitleOpaque(true);
      }, undefined, revealAt);

      tl.fromTo(
        wheel,
        { x: 0, y: 0 },
        {
          x: () => {
            const slot = rouletteWheelSlotRef.current;
            if (!slot) return 0;
            const r = slot.getBoundingClientRect();
            return r.left + r.width / 2 - window.innerWidth / 2;
          },
          y: () => {
            const slot = rouletteWheelSlotRef.current;
            if (!slot) return 0;
            const r = slot.getBoundingClientRect();
            return r.top + r.height / 2 - window.innerHeight / 2;
          },
          duration: ROULETTE_INTRO_CHROME_SEC,
          ease: ROULETTE_INTRO_REVEAL_EASE,
          force3D: true,
        },
        revealAt
      );

      tl.to(
        overlay,
        {
          opacity: 0,
          duration: ROULETTE_INTRO_CHROME_SEC,
          ease: ROULETTE_INTRO_REVEAL_EASE,
          pointerEvents: 'none',
        },
        revealAt
      );

      tl.add(() => {
        if (cancelled) return;
        gsap.killTweensOf(svg);
        gsap.set(svg, { clearProps: 'transform' });
        gsap.set(wheel, {
          clearProps:
            'position,top,left,width,height,zIndex,scale,xPercent,yPercent,x,y,transform,pointerEvents',
        });
        gsap.set(overlay, { opacity: 0, pointerEvents: 'none' });
        gsap.set(wrap, { pointerEvents: 'auto' });
        setRouletteSpinTitleExpanded(true);
        setRouletteSpinChromeVisible(true);
      }, revealEnd);

      tl.to(
        [header, prefs],
        {
          opacity: 1,
          y: 0,
          duration: ROULETTE_INTRO_CHROME_SEC,
          ease: ROULETTE_INTRO_REVEAL_EASE,
          pointerEvents: 'auto',
        },
        revealAt
      );
      tl.to(
        macro,
        {
          opacity: 1,
          y: 0,
          duration: ROULETTE_INTRO_CHROME_SEC,
          ease: ROULETTE_INTRO_REVEAL_EASE,
          pointerEvents: 'auto',
        },
        revealAt
      );
      tl.to(
        historySlide,
        {
          opacity: 1,
          x: 0,
          duration: ROULETTE_INTRO_CHROME_SEC,
          ease: ROULETTE_INTRO_REVEAL_EASE,
          pointerEvents: 'auto',
        },
        revealAt
      );
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [hasEntered]);

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

  const handleEditPreferences = useCallback(() => {
    if (formCollapsed) {
      setFormCollapsed(false);
      setRouletteKey((k) => k + 1);
    } else {
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

  const reloadLocalStateAfterRestore = useCallback(async () => {
    await loadFromStorage();
    await loadProfileFromStorage();
    setLogVersion((v) => v + 1);
  }, [loadFromStorage, loadProfileFromStorage]);

  useEffect(() => {
    const wrapper = prefsWrapperRef.current;
    const screen = prefsScreenRef.current;
    const bar = prefsRollerBarRef.current;
    if (!wrapper) return;
    if (prefsPullingRef.current) return;
    const expandedHeight = 5000;
    if (formCollapsed) {
      // If the open state removed maxHeight, restore a numeric value so the close animation works.
      const currentH = wrapper.offsetHeight || wrapper.scrollHeight || 0;
      gsap.set(wrapper, { maxHeight: currentH, overflow: 'hidden' });
      if (screen) gsap.to(screen, { scaleY: 0, duration: 0.28, ease: 'power2.in', transformOrigin: 'top center' });
      gsap.to(wrapper, { maxHeight: 0, duration: 0.3, ease: 'power2.in', overflow: 'hidden', delay: 0.02 });
      if (bar) gsap.to(bar, { y: 0, duration: 0.3, ease: 'power2.in', delay: 0.02 });
    } else {
      // Measure wrapper height when expanded so animations can run to the real height.
      gsap.set(wrapper, { maxHeight: expandedHeight, overflow: 'hidden' });
      const openHeight = wrapper.offsetHeight || wrapper.scrollHeight;
      prefsOpenHeightRef.current = openHeight;

      // Start from whatever state we're currently in (e.g. partially open from a pull).
      const currentH = wrapper.offsetHeight || 0;
      const currentScale = screen ? (gsap.getProperty(screen, 'scaleY') as number) : 0;

      gsap.set(wrapper, { maxHeight: currentH, overflow: 'hidden' });
      if (screen) gsap.set(screen, { scaleY: currentScale, transformOrigin: 'top center' });
      if (bar) gsap.set(bar, { y: 0 });

      const openDuration = 0.3;
      const openEase = 'power2.out';
      gsap.to(wrapper, {
        maxHeight: openHeight,
        duration: openDuration,
        ease: openEase,
        overflow: 'hidden',
        onComplete: () => {
          // Keep a large numeric maxHeight so growth is not clipped, while preserving close animation.
          gsap.set(wrapper, { maxHeight: expandedHeight, overflow: 'hidden' });
        },
      });
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
      <div ref={introOverlayRef} className="roulette-intro-overlay" aria-hidden />
      <AppHeader
        ref={appHeaderRef}
        suppressMountEntrance
        showEditPreferences={false}
        streak={streak}
        cloudBackup={
          <CloudBackupMenu dataVersion={logVersion} onLocalRestored={reloadLocalStateAfterRestore} />
        }
      />
      <div ref={historyHostRef} className="app__history-bookmark-host">
        <div ref={historyBookmarkSlideRef} className="app__history-bookmark-intro-slide">
          <HistoryBookmark
            ref={historyBookmarkRef}
            count={historyCount}
            historyOpen={historyOpen}
            onClick={() => setHistoryOpen((v) => !v)}
          />
        </div>
      </div>
      <div ref={wrapRef} className="wrap">
        <div className="main-layout">
          <div ref={prefsChromeRef} className="app__roulette-top-chrome">
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
                <PreferencesForm />
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
          </div>
          <RouletteView
            key={rouletteKey}
            onAddMeal={handleAddMeal}
            wheelContainerRef={rouletteWheelRef}
            wheelSlotRef={rouletteWheelSlotRef}
            hideSpinZoneChrome={!rouletteSpinChromeVisible}
            spinTitleOpaque={rouletteSpinTitleOpaque}
            spinTitleExpanded={rouletteSpinTitleExpanded}
          />
        </div>
      </div>
      <MacroTrackerBar
        ref={macroTrackerRef}
        domRootRef={macroTrackerDomRef}
        suppressMountEntrance
        targets={{
          protein: dailyProteinTarget ?? proteinTarget * DEFAULT_TRACKER_MEALS_PER_DAY,
          carbs: dailyCarbsTarget ?? carbsTarget * DEFAULT_TRACKER_MEALS_PER_DAY,
          fat: dailyFatTarget ?? fatTarget * DEFAULT_TRACKER_MEALS_PER_DAY,
          calories: dailyCalorieTarget ?? calorieCap * DEFAULT_TRACKER_MEALS_PER_DAY,
        }}
      />
      <HistoryPanel isOpen={historyOpen} onClose={() => setHistoryOpen(false)} />
    </>
  );
}

export { App };
