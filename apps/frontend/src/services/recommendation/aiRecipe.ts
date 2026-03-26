/**
 * Dynamic AI recipe generation: free LLMs (Groq, Hugging Face) with fallback.
 *
 * - Batch: generateAIRecipesBatch(prefs, 10) — one prompt for 10 meals (ingredients, steps, macros).
 *   Used by the deck so user gets 10 LLM-generated cards; when they run out, we call again for 10 more.
 * - Single: generateAIRecipe(prefs) — one recipe (for backward compat / prefetch).
 *
 * Priority: VITE_GROQ_API_KEY (free, fast) → VITE_HF_TOKEN (Hugging Face free tier) → mock recipes.
 * Preferences are structured into a clear prompt: protein, carbs, fat, calories, cook time, preferred ingredients.
 */

import type {
  MacroPreferences,
  Recipe,
  RecipeMacros,
  UserProfile,
} from '@mealroulette/shared-types';
import { putRecipesInCache } from '@/services/cache';
import { useMacroPreferenceStore } from '@/state/macroPreferenceStore';
import { useUserProfileStore } from '@/state/userProfileStore';

const AI_RECIPE_PREFIX = 'ai-';
const GROQ_MODEL = 'llama-3.1-8b-instant';
const GROQ_MAX_TOKENS = 4096;
const HF_MODEL = 'mistralai/Mistral-7B-Instruct-v0.2';
const HF_MAX_TOKENS = 4096;
const BATCH_SIZE_DEFAULT = 10;

function now(): string {
  return new Date().toISOString();
}

/** Unique id per call so each preference update gets a new recipe. */
function uniqueAiId(): string {
  return `${AI_RECIPE_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function tagsFromProfile(profile: UserProfile | null, prefs: MacroPreferences): string[] {
  if (!profile || profile.likedCount === 0) {
    return prefs.preferredIngredients?.length
      ? [...prefs.preferredIngredients]
      : ['balanced'];
  }
  const entries = Object.entries(profile.likedTagCounts);
  if (entries.length === 0) return ['balanced'];
  entries.sort((a, b) => b[1] - a[1]);
  return entries.slice(0, 5).map(([tag]) => tag);
}

function macroFromProfile(
  profile: UserProfile | null,
  prefs: MacroPreferences,
  perMeal: number
): { protein: number; carbs: number; fat: number; calories: number } {
  if (profile && profile.likedCount > 0) {
    const { likedMacroSum, likedCount } = profile;
    const n = likedCount;
    return {
      protein: Math.round(likedMacroSum.protein / n),
      carbs: Math.round(likedMacroSum.carbs / n),
      fat: Math.round(likedMacroSum.fat / n),
      calories: Math.round(likedMacroSum.calories / n),
    };
  }
  return {
    protein: Math.round(prefs.proteinTarget / perMeal),
    carbs: Math.round(prefs.carbsTarget / perMeal),
    fat: Math.round(prefs.fatTarget / perMeal),
    calories: Math.round((prefs.calorieCap ?? 2200) / perMeal),
  };
}

/** Build a full Recipe (ingredients, steps, macros, isAiGenerated) for fallback when AI fails. */
function buildMockRecipe(
  prefs: MacroPreferences,
  userProfile: UserProfile | null,
  id: string
): Recipe {
  const perMeal = 3;
  const profile = userProfile ?? null;
  const tags = tagsFromProfile(profile, prefs);
  const macro = macroFromProfile(profile, prefs, perMeal);
  const cookMin =
    prefs.maxCookTimeMinutes != null && prefs.maxCookTimeMinutes !== 60
      ? Math.min(30, prefs.maxCookTimeMinutes)
      : 25;
  return {
    id,
    name: 'AI-suggested meal',
    description: 'Generated to match your macro targets and taste.',
    calories: macro.calories,
    protein: macro.protein,
    carbs: macro.carbs,
    fat: macro.fat,
    servings: 1,
    tags,
    ingredients: [
      'Protein of choice (chicken, tofu, or fish)',
      'Whole grains or rice',
      'Vegetables (e.g. broccoli, bell pepper)',
      'Olive oil, salt, pepper',
      'Herbs to taste',
    ],
    steps: [
      'Season and cook protein over medium heat until done.',
      'Cook grains according to package directions.',
      'Sauté vegetables; combine with protein and grains. Serve.',
    ],
    macros: { ...macro },
    isAiGenerated: true,
    cookTimeMinutes: cookMin,
    createdAt: now(),
    updatedAt: now(),
  };
}

/** Groq Chat Completions (free tier). Returns content or null. Uses JSON mode when possible. */
async function callGroq(
  userMessage: string,
  apiKey: string
): Promise<string | null> {
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are a meal recommender. Reply only with valid JSON. No markdown, no code fences, no extra text.',
          },
          { role: 'user', content: userMessage },
        ],
        max_tokens: GROQ_MAX_TOKENS,
        temperature: 0.6,
        response_format: { type: 'json_object' as const },
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content ?? null;
    return content?.trim() ?? null;
  } catch {
    return null;
  }
}

/** Hugging Face Inference API (text generation). Returns generated text or null on error. */
async function callHuggingFace(
  prompt: string,
  token: string,
  maxTokens: number = HF_MAX_TOKENS
): Promise<string | null> {
  const url = `https://api-inference.huggingface.co/models/${HF_MODEL}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: maxTokens,
          return_full_text: false,
          temperature: 0.6,
        },
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { generated_text?: string } | Array<{ generated_text?: string }>;
    const text = Array.isArray(data)
      ? data[0]?.generated_text ?? null
      : (data as { generated_text?: string }).generated_text ?? null;
    return text ?? null;
  } catch {
    return null;
  }
}

/** Build prompt for roulette: one decisive recipe. Include avoidRecipeNames (e.g. last 5 "Made it") so LLM doesn't repeat. */
function buildPromptForRoulette(
  prefs: MacroPreferences,
  avoidRecipeNames: string[] = []
): string {
  const perMeal = 3;
  const protein = Math.round(prefs.proteinTarget / perMeal);
  const carbs = Math.round(prefs.carbsTarget / perMeal);
  const fat = Math.round(prefs.fatTarget / perMeal);
  const calories = prefs.calorieCap != null ? Math.round(prefs.calorieCap / perMeal) : 600;
  const cookMin =
    prefs.maxCookTimeMinutes != null && prefs.maxCookTimeMinutes !== 60
      ? prefs.maxCookTimeMinutes
      : 120;
  const prefIng = prefs.preferredIngredients ?? [];
  const ingredients =
    prefIng.length > 0
      ? `Preferred ingredients: ${prefIng.join(', ')}.`
      : 'Use a variety of common ingredients.';

  const avoid =
    avoidRecipeNames.length > 0
      ? ` Do NOT suggest any of these (user already made them): ${avoidRecipeNames.join(', ')}. Pick something different.`
      : '';

  return `You are a meal recommender. Choose the single best meal given these constraints. Return only ONE recipe. Do not hedge or offer alternatives.

Return a JSON object with exactly this structure (no other keys, no markdown):
{
  "name": "string (recipe name)",
  "cuisineType": "string (e.g. Italian, Mexican, Asian)",
  "description": "string (one sentence)",
  "cookTimeMinutes": number (total time, under ${cookMin}),
  "macros": { "calories": number, "protein": number, "carbs": number, "fat": number },
  "ingredients": ["string with quantity e.g. 2 chicken breasts", "..."],
  "steps": ["string (step 1)", "string (step 2)", "..."]
}

Constraints: Aim for roughly protein ${protein}g, carbs ${carbs}g, fat ${fat}g, calories ${calories} per serving. Max cook time ${cookMin} minutes. ${ingredients}${avoid}

Output only the JSON object.`;
}

/** Build a structured prompt for the LLM to return N meal recommendations from user preferences. */
function buildPromptForBatch(prefs: MacroPreferences, count: number): string {
  const perMeal = 3;
  const protein = Math.round(prefs.proteinTarget / perMeal);
  const carbs = Math.round(prefs.carbsTarget / perMeal);
  const fat = Math.round(prefs.fatTarget / perMeal);
  const calories = prefs.calorieCap != null ? Math.round(prefs.calorieCap / perMeal) : 600;
  const cookMin =
    prefs.maxCookTimeMinutes != null && prefs.maxCookTimeMinutes !== 60
      ? prefs.maxCookTimeMinutes
      : 120;
  const prefIng = prefs.preferredIngredients ?? [];
  const ingredients =
    prefIng.length > 0
      ? `Preferred ingredients to use: ${prefIng.join(', ')}.`
      : 'Use a variety of common ingredients.';

  return `Generate exactly ${count} meal recommendations as a JSON object with a single key "recipes" whose value is an array of ${count} recipe objects. Each recipe must have:
- name (string)
- description (string, one sentence)
- ingredients (array of strings, specific amounts where helpful)
- steps (array of strings, clear cooking instructions)
- macros (object: calories, protein, carbs, fat — numbers per serving, aim for roughly protein ${protein}g, carbs ${carbs}g, fat ${fat}g, calories ${calories} per meal)
- cookTimeMinutes (number, under ${cookMin})

User preferences: ${ingredients} Max cook time ${cookMin} minutes. Meals should be varied and practical to make.
Output only the JSON object with key "recipes", no other text.`;
}

/** Extract JSON object from AI response (may be wrapped in markdown code block). */
function extractJson(text: string): string | null {
  const trimmed = text.trim();
  const codeBlock = /```(?:json)?\s*([\s\S]*?)```/.exec(trimmed);
  if (codeBlock) return codeBlock[1]!.trim();
  const firstBrace = trimmed.indexOf('{');
  if (firstBrace === -1) return null;
  let depth = 0;
  let end = -1;
  for (let i = firstBrace; i < trimmed.length; i++) {
    if (trimmed[i] === '{') depth++;
    if (trimmed[i] === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) return null;
  return trimmed.slice(firstBrace, end + 1);
}

/** Extract JSON array from text (look for [ ... ] or { "recipes": [ ... ] }). */
function extractRecipesArray(text: string): unknown[] {
  const trimmed = text.trim();
  const jsonStr = extractJson(trimmed) ?? trimmed;
  try {
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    if (Array.isArray(parsed['recipes'])) return parsed['recipes'] as unknown[];
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    const firstBracket = trimmed.indexOf('[');
    if (firstBracket === -1) return [];
    let depth = 0;
    let end = -1;
    for (let i = firstBracket; i < trimmed.length; i++) {
      if (trimmed[i] === '[') depth++;
      if (trimmed[i] === ']') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end === -1) return [];
    try {
      const arr = JSON.parse(trimmed.slice(firstBracket, end + 1)) as unknown[];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }
}

/** Normalize one raw object from LLM array into Recipe. Assigns unique id. */
function normalizeOneRecipe(
  parsed: Record<string, unknown>,
  index: number,
  fallbackMacro: RecipeMacros
): Recipe | null {
  try {
    const name = typeof parsed['name'] === 'string' ? parsed['name'] : `Meal ${index + 1}`;
    const ingredients = Array.isArray(parsed['ingredients'])
      ? (parsed['ingredients'] as unknown[]).map((x) => String(x))
      : [];
    const steps = Array.isArray(parsed['steps'])
      ? (parsed['steps'] as unknown[]).map((x) => String(x))
      : [];
    const macrosObj = parsed['macros'] as Record<string, unknown> | undefined;
    const calories = typeof macrosObj?.['calories'] === 'number' ? macrosObj['calories'] : fallbackMacro.calories;
    const protein = typeof macrosObj?.['protein'] === 'number' ? macrosObj['protein'] : fallbackMacro.protein;
    const carbs = typeof macrosObj?.['carbs'] === 'number' ? macrosObj['carbs'] : fallbackMacro.carbs;
    const fat = typeof macrosObj?.['fat'] === 'number' ? macrosObj['fat'] : fallbackMacro.fat;
    const macros: RecipeMacros = { calories, protein, carbs, fat };
    const id = `${AI_RECIPE_PREFIX}batch-${Date.now()}-${index}`;
    const recipe: Recipe = {
      id,
      name,
      calories,
      protein,
      carbs,
      fat,
      servings: typeof parsed['servings'] === 'number' ? parsed['servings'] : 1,
      tags: Array.isArray(parsed['tags']) ? (parsed['tags'] as unknown[]).map((x) => String(x)) : ['ai-generated'],
      ingredients: ingredients.length > 0 ? ingredients : ['See steps'],
      steps: steps.length > 0 ? steps : ['Combine and cook as desired.'],
      macros,
      isAiGenerated: true,
      createdAt: now(),
      updatedAt: now(),
    };
    if (typeof parsed['description'] === 'string') recipe.description = parsed['description'];
    if (typeof parsed['cookTimeMinutes'] === 'number') recipe.cookTimeMinutes = parsed['cookTimeMinutes'];
    return recipe;
  } catch {
    return null;
  }
}

/** Parse LLM response into Recipe[]. Expects object with "recipes" array or raw array. */
function parseRecipesArrayFromAI(raw: string, fallbackMacro: RecipeMacros): Recipe[] {
  const arr = extractRecipesArray(raw);
  const recipes: Recipe[] = [];
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
      const r = normalizeOneRecipe(item as Record<string, unknown>, i, fallbackMacro);
      if (r) recipes.push(r);
    }
  }
  return recipes;
}

/** Validate and normalize AI JSON into Recipe (single). Returns null if invalid. */
function parseRecipeFromAI(
  raw: string,
  fallbackId: string,
  fallbackMacro: RecipeMacros
): Recipe | null {
  try {
    const json = extractJson(raw);
    if (!json) return null;
    const parsed: Record<string, unknown> = JSON.parse(json);
    const name = typeof parsed['name'] === 'string' ? parsed['name'] : 'AI-suggested meal';
    const ingredients = Array.isArray(parsed['ingredients'])
      ? (parsed['ingredients'] as unknown[]).map((x) => String(x))
      : [];
    const steps = Array.isArray(parsed['steps'])
      ? (parsed['steps'] as unknown[]).map((x) => String(x))
      : [];
    const macrosObj = parsed['macros'] as Record<string, unknown> | undefined;
    const calories = typeof macrosObj?.['calories'] === 'number' ? macrosObj['calories'] : fallbackMacro.calories;
    const protein = typeof macrosObj?.['protein'] === 'number' ? macrosObj['protein'] : fallbackMacro.protein;
    const carbs = typeof macrosObj?.['carbs'] === 'number' ? macrosObj['carbs'] : fallbackMacro.carbs;
    const fat = typeof macrosObj?.['fat'] === 'number' ? macrosObj['fat'] : fallbackMacro.fat;
    const macros: RecipeMacros = { calories, protein, carbs, fat };
    const desc = typeof parsed['description'] === 'string' ? parsed['description'] : undefined;
    const videoUrl = typeof parsed['videoUrl'] === 'string' ? parsed['videoUrl'] : undefined;
    const recipe: Recipe = {
      id: typeof parsed['id'] === 'string' ? parsed['id'] : fallbackId,
      name,
      calories,
      protein,
      carbs,
      fat,
      servings: typeof parsed['servings'] === 'number' ? parsed['servings'] : 1,
      tags: Array.isArray(parsed['tags']) ? (parsed['tags'] as unknown[]).map((x) => String(x)) : ['balanced'],
      ingredients: ingredients.length > 0 ? ingredients : ['See steps for ingredients'],
      steps: steps.length > 0 ? steps : ['Combine ingredients and cook to taste.'],
      macros,
      isAiGenerated: true,
      createdAt: now(),
      updatedAt: now(),
    };
    if (desc !== undefined) recipe.description = desc;
    if (videoUrl !== undefined) recipe.videoUrl = videoUrl;
    return recipe;
  } catch {
    return null;
  }
}

/** Parse single recipe from roulette LLM response (includes cuisineType). */
function parseSingleRecipeFromRouletteAI(
  raw: string,
  fallbackId: string,
  fallbackMacro: RecipeMacros
): Recipe | null {
  try {
    const json = extractJson(raw);
    if (!json) return null;
    const parsed: Record<string, unknown> = JSON.parse(json);
    const name = typeof parsed['name'] === 'string' ? parsed['name'] : 'Tonight’s pick';
    const ingredients = Array.isArray(parsed['ingredients'])
      ? (parsed['ingredients'] as unknown[]).map((x) => String(x))
      : [];
    const steps = Array.isArray(parsed['steps'])
      ? (parsed['steps'] as unknown[]).map((x) => String(x))
      : [];
    const macrosObj = parsed['macros'] as Record<string, unknown> | undefined;
    const calories = typeof macrosObj?.['calories'] === 'number' ? macrosObj['calories'] : fallbackMacro.calories;
    const protein = typeof macrosObj?.['protein'] === 'number' ? macrosObj['protein'] : fallbackMacro.protein;
    const carbs = typeof macrosObj?.['carbs'] === 'number' ? macrosObj['carbs'] : fallbackMacro.carbs;
    const fat = typeof macrosObj?.['fat'] === 'number' ? macrosObj['fat'] : fallbackMacro.fat;
    const macros: RecipeMacros = { calories, protein, carbs, fat };
    const recipe: Recipe = {
      id: fallbackId,
      name,
      calories,
      protein,
      carbs,
      fat,
      servings: 1,
      tags: ['roulette'],
      ingredients: ingredients.length > 0 ? ingredients : ['See steps'],
      steps: steps.length > 0 ? steps : ['Combine and cook as desired.'],
      macros,
      isAiGenerated: true,
      createdAt: now(),
      updatedAt: now(),
    };
    if (typeof parsed['description'] === 'string') recipe.description = parsed['description'];
    if (typeof parsed['cuisineType'] === 'string') recipe.cuisineType = parsed['cuisineType'];
    if (typeof parsed['cookTimeMinutes'] === 'number') recipe.cookTimeMinutes = parsed['cookTimeMinutes'];
    return recipe;
  } catch {
    return null;
  }
}

/**
 * Generate exactly one recipe for the roulette reveal. Decisive prompt; no alternatives.
 * Pass avoidRecipeNames (e.g. last 5 "Made it" meals) so the LLM avoids repeating.
 */
export async function generateSingleRecipeForRoulette(
  prefs: MacroPreferences,
  avoidRecipeNames: string[] = []
): Promise<Recipe | null> {
  const id = uniqueAiId();
  const fallbackMacro = macroFromProfile(null, prefs, 3);
  const prompt = buildPromptForRoulette(prefs, avoidRecipeNames);

  const groqKey = import.meta.env['VITE_GROQ_API_KEY'] as string | undefined;
  if (groqKey) {
    const text = await callGroq(prompt, groqKey);
    if (text) {
      const recipe = parseSingleRecipeFromRouletteAI(text, id, fallbackMacro);
      if (recipe) return recipe;
    }
  }

  const hfToken = import.meta.env['VITE_HF_TOKEN'] as string | undefined;
  if (hfToken) {
    const text = await callHuggingFace(prompt, hfToken, 2048);
    if (text) {
      const recipe = parseSingleRecipeFromRouletteAI(text, id, fallbackMacro);
      if (recipe) return recipe;
    }
  }

  const mock = buildMockRecipe(prefs, null, id);
  mock.cuisineType = 'General';
  return mock;
}

/**
 * Generate a single Recipe from preferences (and optional user profile).
 * Uses free LLM (Hugging Face) when VITE_HF_TOKEN is set; otherwise mock.
 * Ensures unique recipe per call; handles invalid JSON by falling back to mock.
 */
export async function generateAIRecipe(
  prefs: MacroPreferences,
  userProfile?: UserProfile | null
): Promise<Recipe | null> {
  const id = uniqueAiId();
  const profile = userProfile ?? null;
  const fallbackMacro = macroFromProfile(profile, prefs, 3);
  const token = import.meta.env['VITE_HF_TOKEN'] as string | undefined;
  const allowed = prefs.preferredIngredients?.length
    ? prefs.preferredIngredients.join(', ')
    : 'any';
  const cookMin =
    prefs.maxCookTimeMinutes != null && prefs.maxCookTimeMinutes !== 60
      ? prefs.maxCookTimeMinutes
      : 60;

  if (token) {
    const prompt = `Generate exactly one recipe as a JSON object. Use only this structure, no other text:
{
  "id": "${id}",
  "name": "string (recipe name)",
  "description": "string (optional)",
  "ingredients": ["string", "..."],
  "steps": ["string", "..."],
  "macros": { "calories": number, "protein": number, "carbs": number, "fat": number }
}
Requirements: protein about ${fallbackMacro.protein}g, carbs about ${fallbackMacro.carbs}g, fat about ${fallbackMacro.fat}g, calories about ${fallbackMacro.calories}. Max cook time ${cookMin} min. Prefer ingredients: ${allowed}. Output only the JSON object.`;

    const text = await callHuggingFace(prompt, token);
    if (text) {
      const recipe = parseRecipeFromAI(text, id, fallbackMacro);
      if (recipe) return recipe;
    }
  }

  return buildMockRecipe(prefs, profile, id);
}

/** Build a batch of mock recipes (varied names) when LLM is unavailable. */
function buildMockRecipeBatch(
  prefs: MacroPreferences,
  userProfile: UserProfile | null,
  count: number
): Recipe[] {
  const recipes: Recipe[] = [];
  const names = [
    'Grilled Chicken Bowl',
    'Vegetable Stir-Fry',
    'Salmon with Herbed Rice',
    'Black Bean Tacos',
    'Greek Salad with Chicken',
    'Pasta with Tomato Basil',
    'Tofu Curry',
    'Quinoa Buddha Bowl',
    'Eggs & Avocado Toast',
    'Turkey Lettuce Wraps',
  ];
  for (let i = 0; i < count; i++) {
    const r = buildMockRecipe(prefs, userProfile, uniqueAiId());
    r.name = names[i % names.length]!;
    r.description = `Generated to match your preferences (${r.protein}g protein, ${r.calories} cal).`;
    recipes.push(r);
  }
  return recipes;
}

/**
 * Generate a batch of recipes (e.g. 10) from user preferences using a free LLM.
 * Tries Groq (VITE_GROQ_API_KEY) first, then Hugging Face (VITE_HF_TOKEN); falls back to mock batch.
 * Use this to fill the deck: first load returns 10 cards; when they run out, call again for 10 more.
 */
export async function generateAIRecipesBatch(
  prefs: MacroPreferences,
  count: number = BATCH_SIZE_DEFAULT,
  userProfile?: UserProfile | null
): Promise<Recipe[]> {
  const profile = userProfile ?? null;
  const fallbackMacro = macroFromProfile(profile, prefs, 3);
  const prompt = buildPromptForBatch(prefs, count);

  const groqKey = import.meta.env['VITE_GROQ_API_KEY'] as string | undefined;
  if (groqKey) {
    const text = await callGroq(prompt, groqKey);
    if (text) {
      const recipes = parseRecipesArrayFromAI(text, fallbackMacro);
      if (recipes.length > 0) return recipes;
    }
  }

  const hfToken = import.meta.env['VITE_HF_TOKEN'] as string | undefined;
  if (hfToken) {
    const text = await callHuggingFace(prompt, hfToken, 4096);
    if (text) {
      const recipes = parseRecipesArrayFromAI(text, fallbackMacro);
      if (recipes.length > 0) return recipes;
    }
  }

  return buildMockRecipeBatch(prefs, profile, count);
}

/**
 * Store AI-generated recipe in IndexedDB for offline and deck cache.
 */
export async function putAIGeneratedRecipeInCache(recipe: Recipe): Promise<void> {
  await putRecipesInCache([recipe]);
}

/**
 * Prefetch AI recipes into IndexedDB buffer. Call when deck < 3 so next fetch
 * can consume from cache without blocking (smooth UX, 60fps preserved).
 * Does not block: runs in background.
 */
export function prefetchAIRecipes(count: number): void {
  const prefs = useMacroPreferenceStore.getState();
  const profile = useUserProfileStore.getState();
  const prefsObj: MacroPreferences = {
    proteinTarget: prefs.proteinTarget,
    carbsTarget: prefs.carbsTarget,
    fatTarget: prefs.fatTarget,
    tolerance: prefs.tolerance ?? 0.15,
    preferredIngredients: prefs.preferredIngredients ?? [],
  };
  if (prefs.calorieCap !== undefined) prefsObj.calorieCap = prefs.calorieCap;
  if (prefs.maxCookTimeMinutes !== undefined && prefs.maxCookTimeMinutes !== 60)
    prefsObj.maxCookTimeMinutes = prefs.maxCookTimeMinutes;

  (async () => {
    const recipes = await generateAIRecipesBatch(prefsObj, count, profile);
    if (recipes.length > 0) await putRecipesInCache(recipes);
  })().catch(() => {});
}
