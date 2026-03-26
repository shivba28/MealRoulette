import React, {
  useRef,
  useCallback,
  useState,
  useEffect,
  useMemo,
} from 'react';
import type { Recipe } from '@mealroulette/shared-types';
import { getRecipes } from '@/services/graphql';
import { useSwipeStore } from '@/state/swipeStore';
import { useRecipeDeck } from '@/hooks/useRecipeDeck';
import { getRecipesWithCache, prefetchRecipes } from '@/services/cache';
import { enqueueSwipe, scheduleFlush } from '@/services/analytics';
import { useUserProfileStore } from '@/state/userProfileStore';
import { prefetchAIRecipes } from '@/services/recommendation';
import { SwipeableRecipeCard, getRotationForDrag } from './SwipeableRecipeCard';
import type { SwipeDirection } from './SwipeableRecipeCard';
import {
  easeOutCubic,
  springStep,
  isSpringAtRest,
} from './swipePhysics';

/** Deck virtualization: only top 5 cards in DOM to limit re-renders. */
const DECK_SIZE = 5;
/** Preload next batch when remaining cards fall below this. */
const PRELOAD_THRESHOLD = 3;
const BATCH_SIZE = 20;

/** Preload images for next 2 cards (index 1, 2) to avoid visual popping. */
const PRELOAD_IMAGE_COUNT = 2;

/** Horizontal distance (px) to commit swipe (fly off). */
const SWIPE_DISPLACEMENT_THRESHOLD = 80;
/** Velocity (px/ms) on release to commit swipe. Delta-time based. */
const SWIPE_VELOCITY_THRESHOLD = 0.35;

/** Exit animation: ease-out cubic, duration ms. */
const EXIT_DURATION_MS = 220;

/** Raw API: GraphQL getRecipes returns { recipes }; we need Recipe[]. */
async function apiFetchRecipes(offset: number, limit: number): Promise<Recipe[]> {
  const res = await getRecipes({ limit, offset });
  return res.recipes;
}

/**
 * Cache-first fetch for deck: try IndexedDB, then API. After each fetch we
 * prefetch the next batch in the background so the deck stays filled without
 * blocking UI or reducing FPS.
 */
function cacheFirstFetchRecipes(
  offset: number,
  limit: number
): Promise<Recipe[]> {
  return getRecipesWithCache(offset, limit, apiFetchRecipes).then(
    (recipes) => {
      if (recipes.length > 0) {
        prefetchRecipes(offset + recipes.length, limit, apiFetchRecipes);
      }
      return recipes;
    }
  );
}

export interface RecipeCardDeckProps {
  /** Called when user swipes (Like or Pass). Fires after animation completes. */
  onSwipe?: (
    recipe: Recipe,
    direction: SwipeDirection,
    velocity: number
  ) => void;
  /** Optional analytics callback after swipe is recorded. */
  onSwipeComplete?: (
    recipeId: string,
    direction: SwipeDirection,
    velocity: number
  ) => void;
  /** Optional custom fetch (default: getRecipes). */
  fetchRecipes?: (offset: number, limit: number) => Promise<Recipe[]>;
}

type AnimationPhase = 'idle' | 'dragging' | 'exit' | 'spring';

/**
 * Deck of swipeable recipe cards with spring physics.
 *
 * Swipe physics:
 * - Threshold detection: if |dx| >= SWIPE_DISPLACEMENT_THRESHOLD or
 *   release velocity >= SWIPE_VELOCITY_THRESHOLD, card flies off (exit animation).
 * - Otherwise card springs back to center (damped spring, no overshoot).
 * - Velocity: (currentX - prevX) / (now - prevTime), computed on pointer up for delta-time.
 *
 * Animation (requestAnimationFrame, delta-time for 60fps):
 * - Exit: ease-out cubic over EXIT_DURATION_MS; then handleSwipe(recipe, direction, velocity).
 * - Spring back: springStep(x, v, dt) each frame until isSpringAtRest(x, v).
 *
 * Card recycling: we keep only top DECK_SIZE (5) cards in DOM; after swipe, consumeTop()
 * removes the top recipe and the next card becomes top. No unmount/remount of card nodes.
 *
 * Image preload: next 2 cards get preloadImage=true (loading="eager", fetchPriority="high")
 * to avoid visual popping when they become visible.
 */
export function RecipeCardDeck({
  onSwipe,
  onSwipeComplete,
  fetchRecipes: customFetch = cacheFirstFetchRecipes,
}: RecipeCardDeckProps) {
  const recordSwipe = useSwipeStore((s) => s.recordSwipe);

  const { deck, isLoading, ensureLoaded, consumeTop } = useRecipeDeck({
    deckSize: DECK_SIZE,
    preloadThreshold: PRELOAD_THRESHOLD,
    fetchRecipes: customFetch,
    batchSize: BATCH_SIZE,
  });

  const [swipeDirection, setSwipeDirection] = useState<SwipeDirection | null>(
    null
  );
  /** Current transform for top card (px, deg). Used during drag and animation. */
  const [displayX, setDisplayX] = useState(0);
  const [displayRotate, setDisplayRotate] = useState(0);

  const pointerRef = useRef<{
    startX: number;
    startTime: number;
    currentX: number;
    prevX: number;
    prevTime: number;
  } | null>(null);

  const animRef = useRef<{
    phase: AnimationPhase;
    startX: number;
    startRotate: number;
    startTime: number;
    velocityX: number;
    exitEndX: number;
    exitEndRotate: number;
    /** Spring phase: current x (mutated each frame). */
    springX?: number;
    /** Recipe to pass to handleSwipe when exit completes (avoids stale deck). */
    pendingRecipe?: Recipe;
  } | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);

  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);

  useEffect(() => {
    if (deck.length < PRELOAD_THRESHOLD) ensureLoaded();
  }, [deck.length, ensureLoaded, PRELOAD_THRESHOLD]);

  /* Prefetch AI recipes when deck drops below threshold so next fetch has buffer (smooth UX, 60fps). */
  useEffect(() => {
    if (deck.length < PRELOAD_THRESHOLD && deck.length > 0 && !isLoading) {
      prefetchAIRecipes(5);
    }
  }, [deck.length, isLoading]);

  const handleSwipe = useCallback(
    (recipe: Recipe, direction: SwipeDirection, velocity: number) => {
      const timestamp = Date.now();
      recordSwipe(recipe.id, direction, velocity);
      useUserProfileStore.getState().updateFromSwipe(recipe, direction);
      onSwipe?.(recipe, direction, velocity);
      onSwipeComplete?.(recipe.id, direction, velocity);
      const recipeSnapshot = {
        tags: recipe.tags ?? [],
        protein: recipe.protein,
        carbs: recipe.carbs,
        fat: recipe.fat,
        calories: recipe.calories,
      };
      enqueueSwipe(recipe.id, direction, timestamp, velocity, recipeSnapshot).then(
        () => scheduleFlush()
      );
      consumeTop();
      setSwipeDirection(null);
      setDisplayX(0);
      setDisplayRotate(0);
      animRef.current = null;
    },
    [recordSwipe, onSwipe, onSwipeComplete, consumeTop]
  );

  const runAnimation = useCallback(() => {
    const anim = animRef.current;
    if (!anim) return;

    const now = performance.now();
    const dt = Math.min(now - lastFrameTimeRef.current, 32);
    lastFrameTimeRef.current = now;

    if (anim.phase === 'exit') {
      const elapsed = now - anim.startTime;
      const t = Math.min(elapsed / EXIT_DURATION_MS, 1);
      const ease = easeOutCubic(t);
      const x = anim.startX + (anim.exitEndX - anim.startX) * ease;
      const rotate =
        anim.startRotate +
        (anim.exitEndRotate - anim.startRotate) * ease;
      setDisplayX(x);
      setDisplayRotate(rotate);
      if (t >= 1 && anim.pendingRecipe) {
        const direction: SwipeDirection =
          anim.exitEndX > 0 ? 'right' : 'left';
        handleSwipe(
          anim.pendingRecipe,
          direction,
          Math.abs(anim.velocityX)
        );
        animRef.current = null;
        return;
      }
    } else if (anim.phase === 'spring' && anim.springX !== undefined) {
      const currentX = anim.springX;
      const currentV = anim.velocityX;
      const { x: newX, v: newV } = springStep(currentX, currentV, dt);
      anim.velocityX = newV;
      anim.springX = newX;
      setDisplayX(newX);
      setDisplayRotate(getRotationForDrag(newX));
      if (isSpringAtRest(newX, newV)) {
        setDisplayX(0);
        setDisplayRotate(0);
        setSwipeDirection(null);
        animRef.current = null;
        rafRef.current = null;
        return;
      }
    }

    rafRef.current = requestAnimationFrame(runAnimation);
  }, [deck, displayX, handleSwipe]);

  const startExitAnimation = useCallback(
    (startX: number, startRotate: number, velocityX: number) => {
      const recipe = deck[0];
      if (!recipe) return;
      const sign = startX >= 0 ? 1 : -1;
      const exitEndX = sign * (typeof window !== 'undefined' ? window.innerWidth + 120 : 500);
      const exitEndRotate = sign * 12;
      animRef.current = {
        phase: 'exit',
        startX,
        startRotate,
        startTime: performance.now(),
        velocityX,
        exitEndX,
        exitEndRotate,
        pendingRecipe: recipe,
      };
      lastFrameTimeRef.current = performance.now();
      rafRef.current = requestAnimationFrame(runAnimation);
    },
    [deck, runAnimation]
  );

  const startSpringBack = useCallback(
    (currentX: number, _currentRotate: number, velocityX: number) => {
      animRef.current = {
        phase: 'spring',
        startX: currentX,
        startRotate: 0,
        startTime: performance.now(),
        velocityX,
        exitEndX: 0,
        exitEndRotate: 0,
        springX: currentX,
      };
      lastFrameTimeRef.current = performance.now();
      rafRef.current = requestAnimationFrame(runAnimation);
    },
    [runAnimation]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (deck.length === 0) return;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      setSwipeDirection(null);
      pointerRef.current = {
        startX: e.clientX,
        startTime: performance.now(),
        currentX: e.clientX,
        prevX: e.clientX,
        prevTime: performance.now(),
      };
      animRef.current = null;
    },
    [deck.length]
  );

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const p = pointerRef.current;
    if (!p) return;
    p.prevX = p.currentX;
    p.prevTime = performance.now();
    p.currentX = e.clientX;
    const dx = p.currentX - p.startX;
    setDisplayX(dx);
    setDisplayRotate(getRotationForDrag(dx));
    if (Math.abs(dx) < 10) setSwipeDirection(null);
    else setSwipeDirection(dx > 0 ? 'right' : 'left');
  }, []);

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      const p = pointerRef.current;
      pointerRef.current = null;
      if (!p || deck.length === 0) return;

      const now = performance.now();
      const dx = p.currentX - p.startX;
      const dt = now - p.prevTime;
      const velocityX = dt > 0 ? (p.currentX - p.prevX) / dt : 0;
      const absVelocity = Math.abs(velocityX);

      const overDistance = Math.abs(dx) >= SWIPE_DISPLACEMENT_THRESHOLD;
      const overVelocity = absVelocity >= SWIPE_VELOCITY_THRESHOLD;
      const committed = overDistance || overVelocity;

      if (committed) {
        startExitAnimation(displayX, displayRotate, velocityX);
      } else {
        startSpringBack(displayX, displayRotate, velocityX);
      }
    },
    [deck, displayX, displayRotate, startExitAnimation, startSpringBack]
  );

  const handleCardSwipe = useCallback(
    (direction: SwipeDirection) => {
      if (deck.length === 0) return;
      const recipe = deck[0]!;
      handleSwipe(recipe, direction, 0);
    },
    [deck, handleSwipe]
  );

  const cardHandlers = useMemo(
    () => ({
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp,
    }),
    [handlePointerDown, handlePointerMove, handlePointerUp]
  );

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (deck.length === 0 && !isLoading) {
    return (
      <div
        className="recipe-card-deck recipe-card-deck--empty"
        data-testid="recipe-card-deck"
      >
        <p>No recipes to show. Pull to refresh or check back later.</p>
      </div>
    );
  }

  return (
    <div
      className="recipe-card-deck"
      data-testid="recipe-card-deck"
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '3/4',
        maxWidth: 400,
        margin: '0 auto',
      }}
    >
      {deck.map((recipe, i) => (
        <div
          key={`${recipe.id}-${i}`}
          className="recipe-card-deck__card-wrapper"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: deck.length - 1 - i,
          }}
          {...(i === 0 ? cardHandlers : {})}
        >
          <SwipeableRecipeCard
            recipe={recipe}
            index={i}
            swipeDirection={i === 0 ? swipeDirection : null}
            {...(i === 0 ? { displayX, displayRotate } : {})}
            onSwipe={handleCardSwipe}
            zIndex={deck.length - 1 - i}
            preloadImage={i < PRELOAD_IMAGE_COUNT}
          />
        </div>
      ))}
      {isLoading && (
        <div
          className="recipe-card-deck__loading"
          data-testid="deck-loading"
          aria-hidden
        >
          Loading…
        </div>
      )}
    </div>
  );
}
