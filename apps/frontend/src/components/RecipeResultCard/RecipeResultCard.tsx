/**
 * Full-screen recipe result card for the roulette reveal (Screen 3).
 * Structure matches meal_roulette_all_screens.html: recipe-wrap, recipe-card-main, recipe-inner,
 * macro-chip, ingr-list, step-list, recipe-actions (Made It ✓, Re-spin).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import type { Recipe } from '@mealroulette/shared-types';
import { logMadeIt } from '@/services/madeItLog';
import { appendMealToToday } from '@/services/macroLog';
import type { LoggedMeal } from '@/services/macroLog';
import { YouTubeThumbnail } from '@/components/YouTubeThumbnail';
import { SubstitutionPopover } from '@/components/SubstitutionPopover';

export interface RecipeResultCardProps {
  recipe: Recipe;
  onRespin?: () => void;
  onAddMeal?: (meal: LoggedMeal) => void;
}

const MACRO_LABELS: Record<string, string> = {
  protein: 'Protein',
  carbs: 'Carbs',
  fat: 'Fat',
  calories: 'kcal',
};

export function RecipeResultCard({ recipe, onRespin, onAddMeal }: RecipeResultCardProps) {
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [madeItSuccess, setMadeItSuccess] = useState(false);
  const [displayMacros, setDisplayMacros] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [ingredientList, setIngredientList] = useState<string[]>(() => recipe.ingredients ?? []);
  const [openSubstitutionIndex, setOpenSubstitutionIndex] = useState<number | null>(null);
  const macroRef = useRef({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const substitutionAnchorRef = useRef<HTMLButtonElement | null>(null);
  const madeItBtnRef = useRef<HTMLButtonElement>(null);

  const ingredients = ingredientList.length > 0 ? ingredientList : (recipe.ingredients ?? []);

  useEffect(() => {
    setIngredientList(recipe.ingredients ?? []);
  }, [recipe.id]);
  const steps = recipe.steps ?? [];
  const cuisine = recipe.cuisineType ?? 'General';
  const cookMin = recipe.cookTimeMinutes ?? 0;
  const macros = recipe.macros ?? {
    calories: recipe.calories,
    protein: recipe.protein,
    carbs: recipe.carbs,
    fat: recipe.fat,
  };

  useEffect(() => {
    macroRef.current = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    setDisplayMacros({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    gsap.to(macroRef.current, {
      calories: macros.calories ?? 0,
      protein: macros.protein ?? 0,
      carbs: macros.carbs ?? 0,
      fat: macros.fat ?? 0,
      duration: 2,
      delay: 1,
      snap: { calories: 1, protein: 1, carbs: 1, fat: 1 },
      onUpdate: () => {
        setDisplayMacros({
          calories: Math.round(macroRef.current.calories),
          protein: Math.round(macroRef.current.protein),
          carbs: Math.round(macroRef.current.carbs),
          fat: Math.round(macroRef.current.fat),
        });
      },
    });
  }, [recipe.name, macros.calories, macros.protein, macros.carbs, macros.fat]);

  const toggleIngredient = useCallback((index: number) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const toggleStep = useCallback((index: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const handleMadeIt = useCallback(() => {
    logMadeIt(recipe.name);
    const macroValues = recipe.macros ?? {
      calories: recipe.calories,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fat: recipe.fat,
    };
    const meal: LoggedMeal = {
      recipeId: recipe.id,
      recipeName: recipe.name,
      protein: macroValues.protein,
      carbs: macroValues.carbs,
      fat: macroValues.fat,
      calories: macroValues.calories,
      loggedAt: new Date().toISOString(),
    };
    appendMealToToday(meal);
    onAddMeal?.(meal);
    setMadeItSuccess(true);
    if (madeItBtnRef.current) {
      gsap.fromTo(
        madeItBtnRef.current,
        { scale: 1 },
        { scale: 1.08, duration: 0.15, yoyo: true, repeat: 1 }
      );
    }
  }, [recipe.id, recipe.name, recipe.macros, recipe.calories, recipe.protein, recipe.carbs, recipe.fat, onAddMeal]);

  useEffect(() => {
    substitutionAnchorRef.current =
      openSubstitutionIndex !== null ? buttonRefs.current[openSubstitutionIndex] ?? null : null;
  }, [openSubstitutionIndex]);

  const handleUseSubstitute = useCallback((index: number, substitute: string) => {
    setIngredientList((prev) => {
      const next = [...prev];
      if (index >= 0 && index < next.length) next[index] = substitute;
      return next;
    });
    setOpenSubstitutionIndex(null);
  }, []);

  return (
    <article className="recipe-result-card" data-testid="recipe-result-card">
      <div className="recipe-wrap">
        <div className="recipe-card-main">
          <div className="recipe-top-band" aria-hidden />
          <div className="recipe-inner">
            <div className="recipe-result-card__header">
              <div className="recipe-result-card__header-left">
                <div className="recipe-meta">
                  <span className="tag herb-tag">{cuisine}</span>
                  {cookMin > 0 && <span className="tag">~{cookMin} min</span>}
                </div>
                <h2 className="recipe-title">{recipe.name}</h2>
                {recipe.description && <p className="recipe-desc">{recipe.description}</p>}
              </div>

              <div className="recipe-result-card__header-right" aria-label="Nutrition per serving">
                <div className="macro-row">
                  {(['protein', 'carbs', 'fat', 'calories'] as const).map((key) => (
                    <div key={key} className="macro-chip" title={MACRO_LABELS[key]}>
                      {key === 'calories' ? displayMacros[key] : `${displayMacros[key]}g`}
                      <span>{MACRO_LABELS[key]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {ingredients.length > 0 && (
              <>
                <div className="sec-label">Ingredients</div>
                <p className="annotation" style={{ marginBottom: 6 }}>tap ? for substitutes</p>
                <ul className="ingr-list">
                  {ingredients.map((ing, i) => (
                    <li
                      key={i}
                      className={`ingr-item ${checkedIngredients.has(i) ? 'ingr-item--done' : ''}`}
                    >
                      <input
                        type="checkbox"
                        id={`ingr-cb-${i}`}
                        className="ingr-cb"
                        checked={checkedIngredients.has(i)}
                        onChange={() => toggleIngredient(i)}
                        aria-label={`Mark ${ing} as done`}
                      />
                      <span className="ingr-text"><span className="ingr-text-inner">{ing}</span></span>
                      <button
                        type="button"
                        ref={(el) => { buttonRefs.current[i] = el; }}
                        onClick={() => setOpenSubstitutionIndex((prev) => (prev === i ? null : i))}
                        className="ingr-q"
                        aria-label={`Suggest substitute for ${ing}`}
                        aria-expanded={openSubstitutionIndex === i}
                      >
                        ?
                      </button>
                      {openSubstitutionIndex === i && (
                        <SubstitutionPopover
                          recipeName={recipe.name}
                          ingredientName={ing}
                          anchorRef={substitutionAnchorRef}
                          open={true}
                          onClose={() => setOpenSubstitutionIndex(null)}
                          onUseSubstitute={(sub) => handleUseSubstitute(i, sub)}
                        />
                      )}
                    </li>
                  ))}
                </ul>
                <p className="annotation" style={{ margin: '4px 0 10px' }}>check off as you cook</p>
              </>
            )}

            <div className="recipe-result-card__steps-row">
              {steps.length > 0 && (
                <div className="recipe-result-card__steps-col">
                  <div className="sec-label">Steps</div>
                  <ol className="step-list">
                    {steps.map((step, i) => (
                      <li
                        key={i}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleStep(i)}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleStep(i)}
                        className={`step-item ${completedSteps.has(i) ? 'step-item--done' : ''}`}
                      >
                        <span className="step-num">{i + 1}</span>
                        <span className="step-text">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <aside className="recipe-result-card__video-col" aria-label="Video">
                <div className="recipe-youtube-block recipe-youtube-block--side">
                  <YouTubeThumbnail recipeName={recipe.name} />
                </div>
              </aside>
            </div>

            <div className="recipe-actions">
              <button
                ref={madeItBtnRef}
                type="button"
                onClick={handleMadeIt}
                disabled={madeItSuccess}
                className="btn-madeit"
              >
                {madeItSuccess ? 'Nice! Logged for today 🎉' : 'Made It ✓'}
              </button>
              {onRespin && (
                <button type="button" onClick={onRespin} className="btn-outline">
                  Not feeling it? Re-spin
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
