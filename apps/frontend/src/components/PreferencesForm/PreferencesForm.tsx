import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { DEFAULT_CALORIE_CAP_PER_MEAL } from '@mealroulette/shared-types';
import { useMacroPreferenceStore } from '@/state/macroPreferenceStore';
import { TagSearchInput } from '@/components/TagSearchInput';
import { MacroSliderInput } from '@/components/MacroSliderInput';
import { TimePillSelector, COOK_TIME_NO_MAX } from '@/components/TimePillSelector';

const PROTEIN_OPTIONS = [
  'Chicken', 'Salmon', 'Shrimp', 'Beef', 'Turkey', 'Tofu', 'Eggs', 'Tuna',
  'Pork', 'Lamb', 'Tempeh', 'Cottage Cheese', 'Greek Yogurt', 'Lentils', 'Chickpeas',
];
const VEGETABLES = [
  'Spinach', 'Kale', 'Broccoli', 'Cauliflower', 'Bell Pepper', 'Zucchini', 'Cucumber', 'Carrot',
  'Tomato', 'Onion', 'Garlic', 'Mushroom', 'Asparagus', 'Green Beans', 'Peas', 'Corn', 'Eggplant',
  'Sweet Potato', 'Brussels Sprouts', 'Celery', 'Cabbage', 'Bok Choy', 'Leek', 'Artichoke',
  'Beets', 'Radish', 'Turnip', 'Butternut Squash', 'Avocado', 'Edamame', 'Snap Peas',
  'Arugula', 'Romaine', 'Swiss Chard', 'Fennel', 'Jalapeño', 'Serrano Pepper', 'Scallions',
  'Shallots', 'Parsnip',
];
const CARB_OPTIONS = [
  'White Rice', 'Brown Rice', 'Quinoa', 'Bread', 'Pasta', 'Oats', 'Sweet Potato', 'Tortilla',
  'Noodles', 'Couscous', 'Barley', 'Pita', 'Bagel',
];
const FAT_OPTIONS = [
  'Olive Oil', 'Avocado', 'Butter', 'Coconut Oil', 'Nuts', 'Peanut Butter', 'Almond Butter',
  'Cheese', 'Seeds', 'Tahini',
];

/** Split stored preferredIngredients into 4 categories; first matching list wins (case-insensitive). */
function splitIngredients(
  stored: string[],
  proteinList: string[],
  carbList: string[],
  fatList: string[],
  vegetableList: string[]
): { proteins: string[]; vegetables: string[]; carbs: string[]; fats: string[] } {
  const toKey = (s: string) => s.toLowerCase();
  const lists = [
    { key: 'proteins' as const, list: proteinList },
    { key: 'vegetables' as const, list: vegetableList },
    { key: 'carbs' as const, list: carbList },
    { key: 'fats' as const, list: fatList },
  ];
  const optionToCanonical = new Map<string, string>();
  for (const { list } of lists) {
    for (const opt of list) optionToCanonical.set(toKey(opt), opt);
  }
  const result: { proteins: string[]; vegetables: string[]; carbs: string[]; fats: string[] } = {
    proteins: [],
    vegetables: [],
    carbs: [],
    fats: [],
  };
  for (const raw of stored) {
    const key = toKey(raw);
    const canonical = optionToCanonical.get(key) ?? raw;
    let assigned = false;
    for (const { key: cat, list } of lists) {
      if (list.some((o) => toKey(o) === key)) {
        result[cat].push(canonical);
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      result.vegetables.push(canonical);
    }
  }
  return result;
}

export interface PreferencesFormProps {
  onSubmit?: () => void;
  submitLabel?: string;
}

export interface PreferencesFormRef {
  save: () => Promise<void>;
}

export const PreferencesForm = React.forwardRef<PreferencesFormRef | null, PreferencesFormProps>(
  function PreferencesForm(
    { onSubmit },
    ref
  ) {
  const {
    proteinTarget,
    carbsTarget,
    fatTarget,
    calorieCap,
    maxCookTimeMinutes,
    setProteinTarget,
    setCarbsTarget,
    setFatTarget,
    setCalorieCap,
    setPreferredIngredients,
    setMaxCookTimeMinutes,
    persistToStorage,
    loadFromStorage,
  } = useMacroPreferenceStore();

  const [proteins, setProteins] = useState<string[]>([]);
  const [vegetables, setVegetables] = useState<string[]>([]);
  const [carbs, setCarbs] = useState<string[]>([]);
  const [fats, setFats] = useState<string[]>([]);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    loadFromStorage().then(() => {
      if (hasInitializedRef.current) return;
      hasInitializedRef.current = true;
      const stored = useMacroPreferenceStore.getState().preferredIngredients ?? [];
      const split = splitIngredients(
        stored,
        PROTEIN_OPTIONS,
        CARB_OPTIONS,
        FAT_OPTIONS,
        VEGETABLES
      );
      setProteins(split.proteins);
      setVegetables(split.vegetables);
      setCarbs(split.carbs);
      setFats(split.fats);
    });
  }, [loadFromStorage]);

  const save = useCallback(async () => {
    const combined = [...proteins, ...vegetables, ...carbs, ...fats];
    setPreferredIngredients(combined);
    await persistToStorage();
    onSubmit?.();
  }, [proteins, vegetables, carbs, fats, setPreferredIngredients, persistToStorage, onSubmit]);

  useImperativeHandle(ref, () => ({ save }), [save]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      await save();
    },
    [save]
  );

  return (
    <form
      className="preferences-form"
      onSubmit={handleSubmit}
      data-testid="preferences-form"
    >
      <div className="pref-wrap">
        <div className="pref-form">
          <div className="nb-lines" aria-hidden />
          <div className="nb-margin" aria-hidden />
          <div className="pref-inner">
            <h2 className="pref-title">My Preferences</h2>

            <div className="sec-label">Macro targets (per meal)</div>
            <div className="macro-inputs">
              <div className="macro-field">
                <MacroSliderInput
                  label="Protein (g)"
                  min={0}
                  max={400}
                  step={5}
                  unit="g"
                  value={proteinTarget}
                  onChange={setProteinTarget}
                  data-testid="pref-protein"
                />
              </div>
              <div className="macro-field">
                <MacroSliderInput
                  label="Carbs (g)"
                  min={0}
                  max={300}
                  step={5}
                  unit="g"
                  value={carbsTarget}
                  onChange={setCarbsTarget}
                  data-testid="pref-carbs"
                />
              </div>
              <div className="macro-field">
                <MacroSliderInput
                  label="Fat (g)"
                  min={0}
                  max={300}
                  step={5}
                  unit="g"
                  value={fatTarget}
                  onChange={setFatTarget}
                  data-testid="pref-fat"
                />
              </div>
              <div className="macro-field">
                <MacroSliderInput
                  label="Cal cap"
                  min={500}
                  max={5000}
                  step={50}
                  unit="kcal"
                  value={calorieCap ?? DEFAULT_CALORIE_CAP_PER_MEAL}
                  onChange={(v) => setCalorieCap(v)}
                  data-testid="pref-calories"
                />
              </div>
            </div>

            <div className="sec-label">Max cook time</div>
            <div className="time-pills">
              <TimePillSelector
                value={maxCookTimeMinutes ?? COOK_TIME_NO_MAX}
                onChange={(v) => setMaxCookTimeMinutes(v ?? COOK_TIME_NO_MAX)}
                data-testid="pref-cook-time"
              />
            </div>

            <div className="sec-label">Ingredient preferences</div>
            <div className="pref-ingredient-grid">
              <div className="pref-ingredient-row">
                <div className="pref-ingredient-cell">
                  <div className="sec-label pref-ingredient-cell__label">Preferred proteins</div>
                  <TagSearchInput
                    options={PROTEIN_OPTIONS}
                    value={proteins}
                    onChange={setProteins}
                    placeholder="Search proteins…"
                    data-testid="pref-proteins"
                  />
                </div>
                <div className="pref-ingredient-cell">
                  <div className="sec-label pref-ingredient-cell__label">Preferred vegetables</div>
                  <TagSearchInput
                    options={VEGETABLES}
                    value={vegetables}
                    onChange={setVegetables}
                    placeholder="Search vegetables…"
                    data-testid="pref-vegetables"
                  />
                </div>
              </div>
              <div className="pref-ingredient-row">
                <div className="pref-ingredient-cell">
                  <div className="sec-label pref-ingredient-cell__label">Preferred carbs</div>
                  <TagSearchInput
                    options={CARB_OPTIONS}
                    value={carbs}
                    onChange={setCarbs}
                    placeholder="Search carbs…"
                    data-testid="pref-carbs-select"
                  />
                </div>
                <div className="pref-ingredient-cell">
                  <div className="sec-label pref-ingredient-cell__label">Preferred fats</div>
                  <TagSearchInput
                    options={FAT_OPTIONS}
                    value={fats}
                    onChange={setFats}
                    placeholder="Search fats…"
                    data-testid="pref-fats"
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="pref-submit">
              Save Preferences
            </button>
            <p className="annotation" style={{ marginTop: 8 }}>
              saved to your device, no account needed
            </p>
          </div>
        </div>
      </div>
    </form>
  );
});
