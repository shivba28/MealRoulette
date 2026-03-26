/**
 * "Made it" log: store recipe name + date in localStorage.
 * Last 5 are passed to the roulette prompt so the LLM avoids repeating.
 */

const STORAGE_KEY = 'mealroulette-made-it';
const MAX_ENTRIES = 5;

export interface MadeItEntry {
  recipeName: string;
  date: string; // ISO date string
}

function getEntries(): MadeItEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is MadeItEntry =>
        e != null &&
        typeof e === 'object' &&
        typeof (e as MadeItEntry).recipeName === 'string' &&
        typeof (e as MadeItEntry).date === 'string'
    );
  } catch {
    return [];
  }
}

function setEntries(entries: MadeItEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    // ignore
  }
}

/** Last 5 recipe names (for roulette "avoid" list). */
export function getLast5MadeItRecipeNames(): string[] {
  return getEntries().map((e) => e.recipeName);
}

/** Log that the user made this recipe today. */
export function logMadeIt(recipeName: string): void {
  const entries = getEntries();
  const today = new Date().toISOString().slice(0, 10);
  const next = [{ recipeName, date: today }, ...entries.filter((e) => e.recipeName !== recipeName)].slice(0, MAX_ENTRIES);
  setEntries(next);
}
