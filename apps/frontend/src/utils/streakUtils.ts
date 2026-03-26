/**
 * Streak and macro-log key utilities. Uses localStorage keys 'macro-log-YYYY-MM-DD'.
 */

const KEY_PREFIX = 'macro-log-';

export function getTodayKey(): string {
  return `${KEY_PREFIX}${new Date().toISOString().slice(0, 10)}`;
}

/**
 * Get all macro-log keys from localStorage, sorted by date descending.
 */
function getMacroLogKeys(): string[] {
  if (typeof localStorage === 'undefined') return [];
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(KEY_PREFIX) && key.length === KEY_PREFIX.length + 10) {
      keys.push(key);
    }
  }
  keys.sort((a, b) => b.localeCompare(a));
  return keys;
}

/**
 * Check if a date key has at least one meal logged.
 */
function keyHasMeals(key: string): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const data = JSON.parse(raw) as { meals?: unknown[] };
    return Array.isArray(data?.meals) && data.meals.length > 0;
  } catch {
    return false;
  }
}

/**
 * Starting from today (or yesterday if today has no meals), count consecutive
 * calendar days with at least one logged meal. Returns 0 if no streak.
 */
export function calculateStreak(): number {
  const keys = getMacroLogKeys();
  if (keys.length === 0) return 0;

  const today = new Date().toISOString().slice(0, 10);
  const todayKey = `${KEY_PREFIX}${today}`;

  // If today has meals, start from today; otherwise start from yesterday
  let startDate: string;
  if (keys.includes(todayKey) && keyHasMeals(todayKey)) {
    startDate = today;
  } else {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    startDate = yesterday.toISOString().slice(0, 10);
  }

  let streak = 0;
  let d = new Date(startDate + 'T12:00:00Z');
  while (true) {
    const dateStr = d.toISOString().slice(0, 10);
    const key = `${KEY_PREFIX}${dateStr}`;
    if (!keyHasMeals(key)) break;
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}
