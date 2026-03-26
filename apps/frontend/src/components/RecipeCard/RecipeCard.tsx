/**
 * RecipeCard: full recipe details with swipe support.
 *
 * Rendering logic:
 * - Name (required), optional description.
 * - Macros: use recipe.macros when present, else top-level calories/protein/carbs/fat.
 * - Ingredients list (recipe.ingredients ?? []); steps list (recipe.steps ?? []).
 * - Optional videoUrl as external link.
 * - Tags (recipe.tags ?? []).
 * - Swipe actions (Pass/Like) when onSwipe provided; preserves 60fps (no layout thrash).
 *
 * Performance: image lazy-loaded; body scrollable (overflow-y: auto) so long content
 * doesn't force reflow; GPU-friendly (no will-change on card; deck handles transform).
 */

import type { Recipe, RecipeMacros } from '@mealroulette/shared-types';
import { useCachedImageUrl } from '@/hooks/useCachedImageUrl';

export interface RecipeCardProps {
  recipe: Recipe;
  onSwipe?: (direction: 'left' | 'right') => void;
  className?: string;
}

/** Resolve macros from nested recipe.macros or top-level fields for display. */
function getRecipeMacros(recipe: Recipe): RecipeMacros {
  if (recipe.macros) return recipe.macros;
  return {
    calories: recipe.calories,
    protein: recipe.protein,
    carbs: recipe.carbs,
    fat: recipe.fat,
  };
}

export function RecipeCard({ recipe, onSwipe, className = '' }: RecipeCardProps) {
  const { src: imageSrc } = useCachedImageUrl(recipe.imageUrl);
  const macros = getRecipeMacros(recipe);
  const tags = recipe.tags ?? [];
  const ingredients = recipe.ingredients ?? [];
  const steps = recipe.steps ?? [];

  return (
    <article
      className={`recipe-card ${className}`}
      data-testid="recipe-card"
      role="article"
    >
      {recipe.imageUrl ? (
        <img
          src={imageSrc ?? recipe.imageUrl}
          alt={recipe.name}
          className="recipe-card__image"
          loading="lazy"
        />
      ) : (
        <div className="recipe-card__placeholder" aria-hidden />
      )}
      <div className="recipe-card__body recipe-card__body--scroll">
        <h2 className="recipe-card__title">{recipe.name}</h2>
        {recipe.description != null && recipe.description !== '' && (
          <p className="recipe-card__description">{recipe.description}</p>
        )}
        <dl className="recipe-card__macros" aria-label="Nutrition per serving">
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
          <section className="recipe-card__section" aria-label="Ingredients">
            <h3 className="recipe-card__section-title">Ingredients</h3>
            <ul className="recipe-card__list">
              {ingredients.map((ing, i) => (
                <li key={`${i}-${ing.slice(0, 20)}`}>{ing}</li>
              ))}
            </ul>
          </section>
        )}
        {steps.length > 0 && (
          <section className="recipe-card__section" aria-label="Steps">
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
            <a
              href={recipe.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="recipe-card__video-link"
            >
              Watch video
            </a>
          </p>
        )}
        {tags.length > 0 && (
          <ul className="recipe-card__tags" aria-label="Tags">
            {tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        )}
      </div>
      {onSwipe && (
        <div className="recipe-card__actions">
          <button type="button" onClick={() => onSwipe('left')} aria-label="Pass">
            Pass
          </button>
          <button type="button" onClick={() => onSwipe('right')} aria-label="Like">
            Like
          </button>
        </div>
      )}
    </article>
  );
}
