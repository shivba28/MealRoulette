/**
 * userPreferenceMultiplier: multiply base RecipeScore by taste alignment.
 *
 * Feedback loop:
 * - Recipes aligned with user taste (tags the user has liked) get multiplier > 1.
 * - Recipes frequently rejected (tags the user has passed) get multiplier < 1.
 * - Final score = baseScore * userPreferenceMultiplier(recipe, profile).
 *
 * Multiplier is clamped to [MULTIPLIER_MIN, MULTIPLIER_MAX] to avoid over-boost/over-penalty.
 */

import type { Recipe, UserProfile } from '@mealroulette/shared-types';

const MULTIPLIER_MIN = 0.2;
const MULTIPLIER_MAX = 1.5;
/** Max tag contribution per tag (cap so one tag doesn't dominate). */
const TAG_CAP = 5;
/** Boost per "like" for a tag (normalized by TAG_CAP). */
const TAG_BOOST_PER_UNIT = 0.08;
/** Penalty per "pass" for a tag (normalized by TAG_CAP). */
const TAG_PENALTY_PER_UNIT = 0.1;

/**
 * Compute userPreferenceMultiplier for a recipe given the user profile.
 * Boost for tags in likedTagCounts, penalty for tags in passedTagCounts.
 */
export function userPreferenceMultiplier(
  recipe: Recipe,
  profile: UserProfile
): number {
  const tags = recipe.tags ?? [];
  if (tags.length === 0) return 1;

  let boost = 0;
  let penalty = 0;
  for (const tag of tags) {
    const t = tag.trim().toLowerCase();
    if (!t) continue;
    const liked = Math.min(profile.likedTagCounts[t] ?? 0, TAG_CAP);
    const passed = Math.min(profile.passedTagCounts[t] ?? 0, TAG_CAP);
    boost += (liked / TAG_CAP) * TAG_BOOST_PER_UNIT;
    penalty += (passed / TAG_CAP) * TAG_PENALTY_PER_UNIT;
  }
  const multiplier = 1 + boost - penalty;
  return Math.max(MULTIPLIER_MIN, Math.min(MULTIPLIER_MAX, multiplier));
}
