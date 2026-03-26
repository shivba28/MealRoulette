import React, { memo, useRef, useCallback, useEffect } from 'react';
import type { Recipe, RecipeMacros } from '@mealroulette/shared-types';
import { useCachedImageUrl } from '@/hooks/useCachedImageUrl';

function getRecipeMacros(recipe: Recipe): RecipeMacros {
  if (recipe.macros) return recipe.macros;
  return {
    calories: recipe.calories,
    protein: recipe.protein,
    carbs: recipe.carbs,
    fat: recipe.fat,
  };
}

export type SwipeDirection = 'left' | 'right';

export interface SwipeableRecipeCardProps {
  recipe: Recipe;
  index: number;
  /** Current drag/swipe direction for visual feedback; null when idle. */
  swipeDirection: SwipeDirection | null;
  /** Current horizontal position (px). During drag = dragOffsetX; during animation = deck-driven. */
  displayX?: number;
  /** Current rotation (deg). Proportional to swipe distance, clamped to avoid spinning. */
  displayRotate?: number;
  onSwipe: (direction: SwipeDirection) => void;
  /** Z-index for stack order (top card highest). */
  zIndex: number;
  /** Preload image (next 2 cards): use fetchpriority and avoid lazy to reduce pop-in. */
  preloadImage?: boolean;
}

/** Rotation (deg) per px drag; clamped so extreme swipes don't spin. */
const ROTATION_PER_PX = 0.12;
const ROTATION_CLAMP_DEG = 15;

/**
 * GPU-only transforms: translate3d, rotate. No left/top/margin.
 * Compositor runs these without layout/paint; 60fps-friendly.
 */
const CARD_STYLE: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  willChange: 'transform',
  transform: 'translate3d(0, 0, 0)',
  backfaceVisibility: 'hidden',
  touchAction: 'none',
};

/**
 * Rotation angle proportional to horizontal drag, clamped to avoid spinning.
 * displayRotate (deg) is set by deck; we only apply it here for GPU transform.
 */
function clampRotation(rotate: number): number {
  return Math.max(-ROTATION_CLAMP_DEG, Math.min(ROTATION_CLAMP_DEG, rotate));
}

/**
 * Memoized swipeable card. Re-renders only when recipe, index, displayX/Rotate, or zIndex change.
 * All motion is transform-only (GPU); no layout thrashing.
 */
function SwipeableRecipeCardComponent({
  recipe,
  index,
  swipeDirection: _swipeDirection,
  displayX = 0,
  displayRotate = 0,
  onSwipe,
  zIndex,
  preloadImage = false,
}: SwipeableRecipeCardProps) {
  const cardRef = useRef<HTMLElement>(null);
  const { src: imageSrc } = useCachedImageUrl(recipe.imageUrl);
  const macros = getRecipeMacros(recipe);
  const tags = recipe.tags ?? [];
  const ingredients = recipe.ingredients ?? [];
  const steps = recipe.steps ?? [];

  const applyTransform = useCallback((x: number, rotate: number) => {
    const el = cardRef.current;
    if (!el) return;
    const clampedRotate = clampRotation(rotate);
    el.style.transform = `translate3d(${x}px, 0, 0) rotate(${clampedRotate}deg)`;
  }, []);

  useEffect(() => {
    applyTransform(displayX, displayRotate);
  }, [displayX, displayRotate, applyTransform]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onSwipe('left');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onSwipe('right');
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onSwipe('right');
      }
    },
    [onSwipe]
  );

  return (
    <article
      ref={cardRef}
      className="recipe-card recipe-card--swipeable"
      data-testid="swipeable-recipe-card"
      data-recipe-id={recipe.id}
      role="article"
      aria-label={recipe.name}
      tabIndex={index === 0 ? 0 : -1}
      style={{
        ...CARD_STYLE,
        zIndex,
      }}
      onKeyDown={handleKeyDown}
    >
      {recipe.imageUrl ? (
        <img
          src={imageSrc ?? recipe.imageUrl}
          alt={recipe.name}
          className="recipe-card__image"
          loading={preloadImage ? 'eager' : 'lazy'}
          decoding="async"
          {...(preloadImage ? { fetchPriority: 'high' as const } : {})}
        />
      ) : (
        <div className="recipe-card__placeholder" aria-hidden />
      )}
      <div className="recipe-card__body recipe-card__body--scroll">
        <h2 className="recipe-card__title">{recipe.name}</h2>
        {recipe.description != null && recipe.description !== '' && (
          <p className="recipe-card__description">{recipe.description}</p>
        )}
        <dl className="recipe-card__macros">
          <div>
            <dt>Calories</dt>
            <dd>{macros.calories}</dd>
          </div>
          <div>
            <dt>Protein</dt>
            <dd>{macros.protein}g</dd>
          </div>
          <div>
            <dt>Carbs</dt>
            <dd>{macros.carbs}g</dd>
          </div>
          <div>
            <dt>Fat</dt>
            <dd>{macros.fat}g</dd>
          </div>
        </dl>
        {ingredients.length > 0 && (
          <section className="recipe-card__section">
            <h3 className="recipe-card__section-title">Ingredients</h3>
            <ul className="recipe-card__list">
              {ingredients.map((ing, i) => (
                <li key={`${i}-${ing.slice(0, 20)}`}>{ing}</li>
              ))}
            </ul>
          </section>
        )}
        {steps.length > 0 && (
          <section className="recipe-card__section">
            <h3 className="recipe-card__section-title">Steps</h3>
            <ol className="recipe-card__list recipe-card__list--ordered">
              {steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </section>
        )}
        {recipe.videoUrl != null && recipe.videoUrl !== '' && (
          <p className="recipe-card__video">
            <a href={recipe.videoUrl} target="_blank" rel="noopener noreferrer" className="recipe-card__video-link">
              Watch video
            </a>
          </p>
        )}
        {tags.length > 0 && (
          <ul className="recipe-card__tags">
            {tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

export const SwipeableRecipeCard = memo(SwipeableRecipeCardComponent);

/** Export for tests: rotation proportional to drag, clamped. */
export function getRotationForDrag(dragX: number): number {
  const raw = dragX * ROTATION_PER_PX;
  return clampRotation(raw);
}
