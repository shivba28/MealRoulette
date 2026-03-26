/**
 * Roulette experience: wheel spin (or skip) then recipe reveal. Matches meal_roulette_screen3_wheel.html behavior.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Recipe } from '@mealroulette/shared-types';
import { gsap } from 'gsap';
import { generateSingleRecipeForRoulette } from '@/services/recommendation';
import { getLast5MadeItRecipeNames } from '@/services/madeItLog';
import { useMacroPreferenceStore } from '@/state/macroPreferenceStore';
import type { LoggedMeal } from '@/services/macroLog';
import { RecipeResultCard } from '@/components/RecipeResultCard';

/** Wheel spin duration in ms (mockup used 1900; increased for a longer spin). */
const WHEEL_SPIN_DURATION_MS = 3000;
const WHEEL_SPIN_EASE = 'cubic-bezier(0.25, 0.1, 0.08, 1)';

export interface RouletteViewProps {
  onAddMeal?: (meal: LoggedMeal) => void;
}

function getPrefs(): import('@mealroulette/shared-types').MacroPreferences {
  const s = useMacroPreferenceStore.getState();
  const prefs: import('@mealroulette/shared-types').MacroPreferences = {
    proteinTarget: s.proteinTarget,
    carbsTarget: s.carbsTarget,
    fatTarget: s.fatTarget,
    tolerance: s.tolerance ?? 0.15,
    preferredIngredients: s.preferredIngredients ?? [],
  };
  if (s.calorieCap !== undefined) prefs.calorieCap = s.calorieCap;
  if (s.maxCookTimeMinutes != null && s.maxCookTimeMinutes !== 60)
    prefs.maxCookTimeMinutes = s.maxCookTimeMinutes;
  return prefs;
}

const SKIP_ANIMATION_STORAGE_KEY = 'mealroulette-skip-wheel-animation';

function getStoredSkipAnimation(): boolean {
  try {
    return localStorage.getItem(SKIP_ANIMATION_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function RouletteView({ onAddMeal }: RouletteViewProps) {
  const [phase, setPhase] = useState<'idle' | 'spinning' | 'reveal'>('idle');
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [animationDone, setAnimationDone] = useState(false);
  const [recipeReady, setRecipeReady] = useState(false);
  const [skipAnimation, setSkipAnimation] = useState(getStoredSkipAnimation);
  const recipeRef = useRef<Recipe | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const wheelSvgRef = useRef<SVGSVGElement>(null);
  const wheelRotationRef = useRef(0);

  const runSpin = useCallback(() => {
    setError(null);
    setRecipe(null);
    setAnimationDone(false);
    setRecipeReady(false);
    recipeRef.current = null;
    setPhase('spinning');

    const prefs = getPrefs();
    const avoidNames = getLast5MadeItRecipeNames();
    generateSingleRecipeForRoulette(prefs, avoidNames).then((result) => {
      if (result) recipeRef.current = result;
      setRecipeReady(true);
    }).catch(() => {
      setRecipeReady(true);
    });

    if (skipAnimation) {
      requestAnimationFrame(() => setAnimationDone(true));
    }
  }, [skipAnimation]);

  const handleWheelTransitionEnd = useCallback((e: React.TransitionEvent<SVGSVGElement>) => {
    if (e.propertyName !== 'transform') return;
    setAnimationDone(true);
  }, []);

  /* Run wheel rotation when entering spinning and not skipping. */
  useEffect(() => {
    if (phase !== 'spinning' || skipAnimation) return;
    const el = wheelSvgRef.current;
    if (!el) return;
    wheelRotationRef.current += 1080 + Math.floor(Math.random() * 360);
    const deg = wheelRotationRef.current;
    const durationSec = WHEEL_SPIN_DURATION_MS / 1000;
    el.style.transition = `transform ${durationSec}s ${WHEEL_SPIN_EASE}`;
    el.style.transform = `rotate(${deg}deg)`;
  }, [phase, skipAnimation]);

  useEffect(() => {
    if (!animationDone || !recipeReady) return;
    const data = recipeRef.current;
    if (data) {
      setRecipe(data);
      setPhase('reveal');
    } else {
      setError('Could not get a recipe. Try again.');
      setPhase('idle');
    }
  }, [animationDone, recipeReady]);

  const handleSkipAnimationChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setSkipAnimation(checked);
    try {
      if (checked) localStorage.setItem(SKIP_ANIMATION_STORAGE_KEY, 'true');
      else localStorage.removeItem(SKIP_ANIMATION_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (phase !== 'reveal' || !recipe || !cardRef.current) return;
    gsap.fromTo(
      cardRef.current,
      { y: 60, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' }
    );
  }, [phase, recipe]);

  const handleRespin = useCallback(() => {
    runSpin();
  }, [runSpin]);

  if (phase === 'reveal' && recipe) {
    return (
      <div className="roulette-view">
        <div ref={cardRef} className="roulette-view__reveal roulette-view__reveal--glow">
          <RecipeResultCard
            recipe={recipe}
            onRespin={handleRespin}
            {...(onAddMeal && { onAddMeal })}
          />
        </div>
      </div>
    );
  }

  const isSpinning = phase === 'spinning';

  return (
    <div className="roulette-view">
      <div className="spin-zone">
        <div className="sec-label" style={{ alignSelf: 'flex-start', width: '100%' }}>
          Tonight&apos;s roulette
        </div>
        <button
          type="button"
          className="wheel-container"
          onClick={runSpin}
          disabled={isSpinning}
          aria-label="Spin the wheel"
          data-testid="roulette-wheel"
        >
          <svg className="w-pointer" width="24" height="28" viewBox="0 0 24 28" aria-hidden>
            <polygon points="12,2 22,26 12,20 2,26" fill="#c0392b" stroke="#2b2118" strokeWidth="2" strokeLinejoin="round" />
          </svg>
          <svg
            ref={wheelSvgRef}
            className="wsvg"
            width="240"
            height="240"
            viewBox="0 0 240 240"
            aria-hidden
            onTransitionEnd={handleWheelTransitionEnd}
          >
            <circle cx="120" cy="120" r="112" fill="#f7f2e8" stroke="#2b2118" strokeWidth="3" />
            <path d="M120,120 L120,10 A112,112 0 0,1 220,60 Z" fill="#c0392b" opacity="0.82" stroke="#2b2118" strokeWidth="1.5" />
            <path d="M120,120 L220,60 A112,112 0 0,1 220,175 Z" fill="#3a6644" opacity="0.78" stroke="#2b2118" strokeWidth="1.5" />
            <path d="M120,120 L220,175 A112,112 0 0,1 165,230 Z" fill="#d4813a" opacity="0.85" stroke="#2b2118" strokeWidth="1.5" />
            <path d="M120,120 L165,230 A112,112 0 0,1 65,216 Z" fill="#7a4f2a" opacity="0.75" stroke="#2b2118" strokeWidth="1.5" />
            <path d="M120,120 L65,216 A112,112 0 0,1 15,160 Z" fill="#b8973a" opacity="0.80" stroke="#2b2118" strokeWidth="1.5" />
            <path d="M120,120 L15,160 A112,112 0 0,1 30,64 Z" fill="#6a4a8a" opacity="0.70" stroke="#2b2118" strokeWidth="1.5" />
            <path d="M120,120 L30,64 A112,112 0 0,1 120,8 Z" fill="#c0392b" opacity="0.60" stroke="#2b2118" strokeWidth="1.5" />
            <circle cx="120" cy="120" r="110" fill="none" stroke="#2b2118" strokeWidth="2" strokeDasharray="3 4" opacity="0.25" />
            <text fontFamily="Kalam,cursive" fontWeight="700" fontSize="11" fill="#fff" transform="rotate(85,120,120)" textAnchor="middle" x="125" y="25">Italian</text>
            <text fontFamily="Kalam,cursive" fontWeight="700" fontSize="11" fill="#fff" transform="rotate(180,120,120)" textAnchor="middle" x="120" y="25">Thai</text>
            <text fontFamily="Kalam,cursive" fontWeight="700" fontSize="11" fill="#fff" transform="rotate(270,120,120)" textAnchor="middle" x="125" y="25">Mexican</text>
            <text fontFamily="Kalam,cursive" fontWeight="700" fontSize="11" fill="#fff" transform="rotate(30,120,120)" textAnchor="middle" x="120" y="25">Japanese</text>
            <text fontFamily="Kalam,cursive" fontWeight="700" fontSize="11" fill="#fff" transform="rotate(130,120,120)" textAnchor="middle" x="130" y="25">Indian</text>
            <text fontFamily="Kalam,cursive" fontWeight="700" fontSize="11" fill="#fff" transform="rotate(220,120,120)" textAnchor="middle" x="130" y="25">Greek</text>
            <text fontFamily="Kalam,cursive" fontWeight="700" fontSize="11" fill="#fff" transform="rotate(334,120,120)" textAnchor="middle" x="115" y="30">American</text>
          </svg>
          <div className="w-hub">?</div>
        </button>
        <label className="skip-animation">
          <input
            type="checkbox"
            className="ingr-cb"
            checked={skipAnimation}
            onChange={handleSkipAnimationChange}
            aria-label="Skip wheel animation"
          />
          <span>Skip animation</span>
        </label>
        <button
          type="button"
          onClick={runSpin}
          disabled={isSpinning}
          className="spin-btn"
          data-testid="roulette-cta"
          aria-label="What should I make?"
        >
          Spin It!
        </button>
        <div className="annotation">click the wheel or tap the button</div>
      </div>
      {error && (
        <p className="roulette-view__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
