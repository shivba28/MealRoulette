const EXACT_KEYS = new Set([
  'mealroulette-made-it',
  'meal-roulette-visited',
  'mealroulette-skip-wheel-animation',
]);

const MACRO_PREFIX = 'macro-log-';

/** Only keys we own; blocks restoring arbitrary localStorage from a tampered backup. */
export function isAllowedLocalStorageKey(key: string): boolean {
  if (EXACT_KEYS.has(key)) return true;
  return key.startsWith(MACRO_PREFIX) && key.length === MACRO_PREFIX.length + 10;
}
