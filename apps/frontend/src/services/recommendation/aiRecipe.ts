/**
 * Dynamic AI recipe generation: free LLMs (Groq, Hugging Face) with fallback.
 *
 * - Batch: generateAIRecipesBatch(prefs, 10) — one prompt for 10 meals (ingredients, steps, macros).
 *   Used by the deck so user gets 10 LLM-generated cards; when they run out, we call again for 10 more.
 * - Single: generateAIRecipe(prefs) — one recipe (for backward compat / prefetch).
 * - Roulette: generateSingleRecipeForRoulette — prefers IndexedDB cache (deck prefetch), then Groq/HF with
 *   quality checks + retry prompt; last resort is detailed template meals (rouletteTemplates.ts).
 *
 * Priority: VITE_GROQ_API_KEY (free, fast) → VITE_HF_TOKEN (Hugging Face free tier) → mock recipes.
 * Macro preferences are per meal; prompts ask the LLM to hit those targets per serving.
 */

import {
  DEFAULT_CALORIE_CAP_PER_MEAL,
  type MacroPreferences,
  type Recipe,
  type RecipeMacros,
  type UserProfile,
} from '@mealroulette/shared-types';
import { peekRecipesFromCache, putRecipesInCache } from '@/services/cache';
import { useMacroPreferenceStore } from '@/state/macroPreferenceStore';
import { useUserProfileStore } from '@/state/userProfileStore';
import { scoreRecipe } from './scoreRecipe';
import { buildRouletteFallbackRecipe } from './rouletteTemplates';

const AI_RECIPE_PREFIX = 'ai-';
const GROQ_MODEL = 'llama-3.1-8b-instant';
const GROQ_MAX_TOKENS = 4096;
const HF_MODEL = 'mistralai/Mistral-7B-Instruct-v0.2';
const HF_MAX_TOKENS = 4096;
const BATCH_SIZE_DEFAULT = 10;
const ROULETTE_CACHE_PEEK_LIMIT = 48;
const ROULETTE_MACRO_SCORE_FLOOR = 0.22;

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
  prefs: MacroPreferences
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
    protein: Math.round(prefs.proteinTarget),
    carbs: Math.round(prefs.carbsTarget),
    fat: Math.round(prefs.fatTarget),
    calories: Math.round(prefs.calorieCap ?? DEFAULT_CALORIE_CAP_PER_MEAL),
  };
}

/** Build a full Recipe (ingredients, steps, macros, isAiGenerated) for fallback when AI fails. */
function buildMockRecipe(
  prefs: MacroPreferences,
  userProfile: UserProfile | null,
  id: string
): Recipe {
  const profile = userProfile ?? null;
  const tags = tagsFromProfile(profile, prefs);
  const macro = macroFromProfile(profile, prefs);
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

function normalizeAvoidSet(names: string[]): Set<string> {
  return new Set(names.map((n) => n.trim().toLowerCase()).filter((n) => n.length > 0));
}

function conflictsAvoid(recipeName: string, avoid: Set<string>): boolean {
  const n = recipeName.trim().toLowerCase();
  if (!n) return true;
  for (const a of avoid) {
    if (n === a) return true;
    if (a.length >= 6 && n.includes(a)) return true;
    if (n.length >= 6 && a.includes(n)) return true;
  }
  return false;
}

function isCacheCandidateForRoulette(r: Recipe): boolean {
  const name = (r.name ?? '').trim();
  const ing = r.ingredients ?? [];
  const steps = r.steps ?? [];
  return name.length >= 3 && ing.length >= 3 && steps.length >= 3;
}

function pickBestCachedForRoulette(
  candidates: Recipe[],
  prefs: MacroPreferences,
  avoid: Set<string>
): Recipe | null {
  const filtered = candidates.filter(
    (r) => !conflictsAvoid((r.name ?? '').trim(), avoid) && isCacheCandidateForRoulette(r)
  );
  if (filtered.length === 0) return null;
  const scored = filtered
    .map((r) => ({ r, s: scoreRecipe(r, prefs).score }))
    .filter((x) => x.s >= ROULETTE_MACRO_SCORE_FLOOR)
    .sort((a, b) => b.s - a.s);
  const pool = scored.length > 0 ? scored : filtered.map((r) => ({ r, s: scoreRecipe(r, prefs).score })).sort((a, b) => b.s - a.s);
  return pool[0]!.r;
}

function cloneRecipeForRoulette(base: Recipe): Recipe {
  return {
    ...base,
    id: uniqueAiId(),
    tags: Array.from(new Set([...(base.tags ?? []), 'roulette'])),
    createdAt: now(),
    updatedAt: now(),
  };
}

const GENERIC_ROULETTE_NAME =
  /^(ai[- ]?suggested\s*meal|ai[- ]?suggested|tonight[\u2019']s\s*pick|recipe|meal|dish|food)$/i;

function rouletteMeetsQualityBar(recipe: Recipe): boolean {
  const name = (recipe.name ?? '').trim();
  if (name.length < 8) return false;
  if (GENERIC_ROULETTE_NAME.test(name)) return false;
  const ing = recipe.ingredients ?? [];
  const steps = recipe.steps ?? [];
  if (ing.length < 5) return false;
  if (steps.length < 5) return false;
  const substantiveIng = ing.filter((line) => line.trim().length >= 10).length;
  if (substantiveIng < 4) return false;
  const avgStepLen = steps.reduce((a, s) => a + s.length, 0) / steps.length;
  if (avgStepLen < 30) return false;
  const blob = steps.join(' ').toLowerCase();
  if (blob.includes('combine and cook as desired')) return false;
  if (blob.includes('see steps for ingredients')) return false;
  return true;
}

/** Groq Chat Completions (free tier). Returns content or null. Uses JSON mode when possible. */
async function callGroq(
  userMessage: string,
  apiKey: string,
  opts?: { temperature?: number }
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
        temperature: opts?.temperature ?? 0.6,
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
  maxTokens: number = HF_MAX_TOKENS,
  opts?: { temperature?: number }
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
          temperature: opts?.temperature ?? 0.6,
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
  avoidRecipeNames: string[] = [],
  strictRetry = false
): string {
  const protein = Math.round(prefs.proteinTarget);
  const carbs = Math.round(prefs.carbsTarget);
  const fat = Math.round(prefs.fatTarget);
  const calories =
    prefs.calorieCap != null ? Math.round(prefs.calorieCap) : DEFAULT_CALORIE_CAP_PER_MEAL;
  const cookMin =
    prefs.maxCookTimeMinutes != null && prefs.maxCookTimeMinutes !== 60
      ? prefs.maxCookTimeMinutes
      : 120;
  const prefIng = prefs.preferredIngredients ?? [];
  const ingredients =
    prefIng.length > 0
      ? `Preferred ingredients to feature where sensible: ${prefIng.join(', ')}.`
      : 'Use common supermarket ingredients.';

  const avoid =
    avoidRecipeNames.length > 0
      ? ` Do NOT suggest any dish whose name matches or closely resembles: ${avoidRecipeNames.join(', ')}. Choose something clearly different.`
      : '';

  const qualityBlock = strictRetry
    ? `
Your last answer was rejected for being too vague or generic. This response MUST:
- Use a specific, searchable dish title (e.g. "Harissa sheet-pan chicken with roasted carrots"), NOT words like "Meal", "Dish", "Recipe", or "AI-suggested".
- Include at least 6 ingredients; each line must include amounts and units (oz, lb, tbsp, tsp, cups) where appropriate.
- Include at least 6 steps; each step is one or two full sentences with practical detail: prep, pan/oven heat, times, visual/doneness cues (e.g. internal temperature for meat), and how to finish the plate.
- Do not use placeholder lines such as "Cook until done" without explaining how to tell, or "Combine ingredients" without naming what goes in the pan in what order.
`
    : `
Write like a cookbook for a confident home cook:
- "name" must be a real dish title someone would type into a search engine.
- At least 6 ingredients with quantities; name the cut of meat, type of dairy, etc. where it matters.
- At least 6 steps covering prep through serving; mention approximate times, heat levels (medium-high, simmer), and safety/doneness.
- Macros should be realistic for one serving and approximately match the targets below.
`;

  return `You are an experienced recipe developer. Invent exactly ONE complete dinner recipe that fits the user's nutrition targets. Return only ONE recipe. No alternatives, no markdown, no commentary.

${qualityBlock}

Return a JSON object with exactly this structure (no other top-level keys):
{
  "name": "string",
  "cuisineType": "string (e.g. Italian, Mexican, Japanese-inspired)",
  "description": "string (one appetizing sentence)",
  "cookTimeMinutes": number (active + passive under ${cookMin}),
  "macros": { "calories": number, "protein": number, "carbs": number, "fat": number },
  "ingredients": ["string with amounts", "..."],
  "steps": ["string", "..."]
}

Targets per serving: about ${protein}g protein, ${carbs}g carbs, ${fat}g fat, ${calories} kcal. Max total time ${cookMin} minutes. ${ingredients}${avoid}

Output only the JSON object.`;
}

/** Build a structured prompt for the LLM to return N meal recommendations from user preferences. */
function buildPromptForBatch(prefs: MacroPreferences, count: number): string {
  const protein = Math.round(prefs.proteinTarget);
  const carbs = Math.round(prefs.carbsTarget);
  const fat = Math.round(prefs.fatTarget);
  const calories =
    prefs.calorieCap != null ? Math.round(prefs.calorieCap) : DEFAULT_CALORIE_CAP_PER_MEAL;
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
 * Generate exactly one recipe for the roulette reveal.
 * 1) Prefer a macro-matching recipe already in IndexedDB (deck prefetch) when it does not conflict with avoid list.
 * 2) Otherwise call Groq / Hugging Face with a detail-heavy prompt; retry once with stricter instructions if output is too thin.
 * 3) Offline or parse failure: rotate through detailed template meals with real titles, ingredients, and steps.
 */
export async function generateSingleRecipeForRoulette(
  prefs: MacroPreferences,
  avoidRecipeNames: string[] = []
): Promise<Recipe | null> {
  const profile = useUserProfileStore.getState();
  const fallbackMacro = macroFromProfile(profile, prefs);
  const avoidNorm = normalizeAvoidSet(avoidRecipeNames);

  try {
    const cached = await peekRecipesFromCache(ROULETTE_CACHE_PEEK_LIMIT);
    const best = pickBestCachedForRoulette(cached, prefs, avoidNorm);
    if (best) return cloneRecipeForRoulette(best);
  } catch {
    /* IndexedDB unavailable in some environments */
  }

  const groqKey = import.meta.env['VITE_GROQ_API_KEY'] as string | undefined;
  if (groqKey) {
    for (const strictRetry of [false, true]) {
      const rid = uniqueAiId();
      const prompt = buildPromptForRoulette(prefs, avoidRecipeNames, strictRetry);
      const text = await callGroq(prompt, groqKey, {
        temperature: strictRetry ? 0.78 : 0.55,
      });
      if (text) {
        const recipe = parseSingleRecipeFromRouletteAI(text, rid, fallbackMacro);
        if (recipe && rouletteMeetsQualityBar(recipe)) return recipe;
      }
    }
  }

  const hfToken = import.meta.env['VITE_HF_TOKEN'] as string | undefined;
  if (hfToken) {
    for (const strictRetry of [false, true]) {
      const rid = uniqueAiId();
      const prompt = buildPromptForRoulette(prefs, avoidRecipeNames, strictRetry);
      const text = await callHuggingFace(prompt, hfToken, strictRetry ? 3072 : 2048, {
        temperature: strictRetry ? 0.75 : 0.55,
      });
      if (text) {
        const recipe = parseSingleRecipeFromRouletteAI(text, rid, fallbackMacro);
        if (recipe && rouletteMeetsQualityBar(recipe)) return recipe;
      }
    }
  }

  return buildRouletteFallbackRecipe(uniqueAiId(), prefs, fallbackMacro, avoidRecipeNames);
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
  const fallbackMacro = macroFromProfile(profile, prefs);
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
  const fallbackMacro = macroFromProfile(profile, prefs);
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
