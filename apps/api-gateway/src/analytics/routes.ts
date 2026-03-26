/**
 * Analytics API: ingest swipe events (batch) and query metrics per user or recipe.
 *
 * POST /api/analytics/swipes: body { events: [{ recipeId, direction, timestamp?, userId?, velocity?, recipeSnapshot? }] }.
 * recipeSnapshot: { tags?, protein?, carbs?, fat?, calories? } — optional; when present, updates user profile for personalization.
 * Events are stored in memory (reset on restart); for production use a DB.
 *
 * GET /api/analytics/profile?userId=: returns dynamic user profile (likedTagCounts, passedTagCounts, macro sums).
 * GET /api/analytics/metrics?entityId=&type=user|recipe&periodStart=&periodEnd=:
 * Returns { entityId, likes, passes, totalSwipes, likeRate, periodStart, periodEnd }.
 * Uses analytics-service aggregateSwipes for aggregation correctness (unit-tested, 10k stress).
 */

import { type Express, type Request, type Response } from 'express';
import { randomUUID } from 'crypto';
import express from 'express';
import { createRequire } from 'module';
import type { UserProfile, MacroSum } from '@mealroulette/shared-types';
import { EMPTY_USER_PROFILE } from '@mealroulette/shared-types';

const require = createRequire(import.meta.url);
const { aggregateSwipes, SwipeEvent } = require('../../../../services/analytics-service/dist/infrastructure/index.js');

export interface RecipeSnapshot {
  tags?: string[];
  protein?: number;
  carbs?: number;
  fat?: number;
  calories?: number;
}

export interface SwipeEventPayload {
  recipeId: string;
  direction: 'left' | 'right';
  timestamp: string;
  userId?: string;
  velocity?: number;
  /** Optional: used to update user profile (ingredient/macro tendencies). */
  recipeSnapshot?: RecipeSnapshot;
}

const events: Array<{
  id: string;
  userId: string;
  recipeId: string;
  direction: 'left' | 'right';
  timestamp: string;
}> = [];
const DEFAULT_USER_ID = 'anonymous';

/** In-memory user profiles keyed by userId. Updated when swipes include recipeSnapshot. Swap for Redis/NoSQL in production. */
const userProfiles = new Map<string, UserProfile>();

function addMacroSum(sum: MacroSum, snap: RecipeSnapshot): MacroSum {
  return {
    protein: sum.protein + (snap.protein ?? 0),
    carbs: sum.carbs + (snap.carbs ?? 0),
    fat: sum.fat + (snap.fat ?? 0),
    calories: sum.calories + (snap.calories ?? 0),
  };
}

function addTagCounts(
  counts: Record<string, number>,
  tags: string[]
): Record<string, number> {
  const next = { ...counts };
  for (const tag of tags) {
    const t = tag.trim().toLowerCase();
    if (!t) continue;
    next[t] = (next[t] ?? 0) + 1;
  }
  return next;
}

function applySwipeToProfile(
  profile: UserProfile,
  direction: 'left' | 'right',
  snap: RecipeSnapshot
): UserProfile {
  const tags = snap.tags ?? [];
  if (direction === 'right') {
    return {
      ...profile,
      likedTagCounts: addTagCounts(profile.likedTagCounts, tags),
      likedMacroSum: addMacroSum(profile.likedMacroSum, snap),
      likedCount: profile.likedCount + 1,
    };
  }
  return {
    ...profile,
    passedTagCounts: addTagCounts(profile.passedTagCounts, tags),
    passedMacroSum: addMacroSum(profile.passedMacroSum, snap),
    passedCount: profile.passedCount + 1,
  };
}

export function applyAnalyticsRoutes(app: Express): void {
  app.use('/api/analytics', express.json({ limit: '100kb' }));

  app.post(
    '/api/analytics/swipes',
    (req: Request<object, object, { events?: SwipeEventPayload[] }>, res: Response) => {
      const body = req.body;
      if (!body || !Array.isArray(body.events)) {
        res.status(400).json({ error: 'Missing or invalid body.events' });
        return;
      }
      const now = new Date().toISOString();
      for (const e of body.events) {
        if (!e.recipeId || !e.direction) continue;
        const id = randomUUID();
        const userId = e.userId ?? DEFAULT_USER_ID;
        const timestamp = e.timestamp ?? now;
        events.push({ id, userId, recipeId: e.recipeId, direction: e.direction, timestamp });
        if (e.recipeSnapshot) {
          const current = userProfiles.get(userId) ?? { ...EMPTY_USER_PROFILE };
          userProfiles.set(userId, applySwipeToProfile(current, e.direction, e.recipeSnapshot));
        }
      }
      res.status(204).send();
    }
  );

  app.get('/api/analytics/profile', (req: Request, res: Response) => {
    const userId = (req.query['userId'] as string) ?? DEFAULT_USER_ID;
    const profile = userProfiles.get(userId) ?? { ...EMPTY_USER_PROFILE };
    res.json(profile);
  });

  app.get('/api/analytics/metrics', (req: Request, res: Response) => {
    const entityId = req.query['entityId'] as string | undefined;
    const type = req.query['type'] as string | undefined;
    const periodStart = (req.query['periodStart'] as string) ?? '1970-01-01';
    const periodEnd = (req.query['periodEnd'] as string) ?? '9999-12-31';
    if (!entityId || !type) {
      res.status(400).json({ error: 'Query params entityId and type required' });
      return;
    }
    if (type !== 'user' && type !== 'recipe') {
      res.status(400).json({ error: 'type must be "user" or "recipe"' });
      return;
    }
    const filtered = events.filter((e) => {
      const match = type === 'user' ? e.userId === entityId : e.recipeId === entityId;
      if (!match) return false;
      return e.timestamp >= periodStart && e.timestamp <= periodEnd;
    });
    const domainEvents = filtered.map(
      (e) => new SwipeEvent(e.id, e.userId, e.recipeId, e.direction, e.timestamp)
    );
    const metric = aggregateSwipes({
      events: domainEvents,
      entityId,
      periodStart,
      periodEnd,
    });
    res.json({
      entityId: metric.entityId,
      likes: metric.likes,
      passes: metric.passes,
      totalSwipes: metric.totalSwipes,
      likeRate: metric.likeRate,
      periodStart: metric.periodStart,
      periodEnd: metric.periodEnd,
    });
  });
}
