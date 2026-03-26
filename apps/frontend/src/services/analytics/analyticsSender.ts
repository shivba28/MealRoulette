/**
 * Batch sender for swipe events. Uses requestIdleCallback to flush without
 * blocking the main thread, preserving 60fps deck animations.
 *
 * Batching: each flush sends up to BATCH_SIZE (20) events; if queue has more,
 * we schedule another flush on next idle so we never block the main thread.
 *
 * FPS preservation: scheduleFlush() does not run flush on the current stack—
 * it schedules flushSwipeQueue() via requestIdleCallback (or setTimeout(0) in envs without rIC).
 * The deck's handleSwipe calls enqueueSwipe().then(() => scheduleFlush()) so the animation
 * and consumeTop() run immediately; analytics send happens in the next idle period.
 *
 * Offline: when navigator.onLine is false we skip send; events remain in IndexedDB.
 * When the user comes back online, App's 'online' listener calls flushSwipeQueue().
 */

import {
  peekQueue,
  removeFromQueue,
  type QueuedSwipeRow,
} from './swipeQueue';

const BATCH_SIZE = 20;
const ANALYTICS_URL =
  import.meta.env['VITE_ANALYTICS_URL'] ?? '/api/analytics/swipes';

/** Default anonymous userId when not authenticated. */
const DEFAULT_USER_ID = 'anonymous';

function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

/**
 * Send a batch of events to AnalyticsService. Returns true if all sent.
 */
async function sendBatch(rows: QueuedSwipeRow[]): Promise<boolean> {
  const events = rows.map((r) => ({
    recipeId: r.recipeId,
    direction: r.direction,
    timestamp: new Date(r.timestamp).toISOString(),
    velocity: r.velocity,
    userId: r.userId ?? DEFAULT_USER_ID,
    ...(r.recipeSnapshot && { recipeSnapshot: r.recipeSnapshot }),
  }));
  try {
    const res = await fetch(ANALYTICS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
    });
    if (!res.ok) return false;
    await removeFromQueue(rows.map((r) => r.id));
    return true;
  } catch {
    return false;
  }
}

let flushScheduled = false;

/**
 * Drain queue in batches and send. Schedules itself via requestIdleCallback
 * so it doesn't block the main thread; stops when queue is empty or send fails.
 */
export async function flushSwipeQueue(): Promise<void> {
  if (!isOnline()) return;
  const batch = await peekQueue(BATCH_SIZE);
  if (batch.length === 0) {
    flushScheduled = false;
    return;
  }
  const ok = await sendBatch(batch);
  if (!ok) {
    flushScheduled = false;
    return;
  }
  const requestIdleCallback =
    typeof window !== 'undefined' && window.requestIdleCallback
      ? window.requestIdleCallback
      : (cb: () => void) => setTimeout(cb, 0);
  flushScheduled = true;
  requestIdleCallback(() => {
    void flushSwipeQueue();
  });
}

/**
 * Schedule a flush on next idle (or immediately if already idle). Call after enqueueSwipe.
 * Non-blocking; does not run flush on the current stack so 60fps is preserved.
 */
export function scheduleFlush(): void {
  if (flushScheduled) return;
  if (!isOnline()) return;
  flushScheduled = true;
  const requestIdleCallback =
    typeof window !== 'undefined' && window.requestIdleCallback
      ? window.requestIdleCallback
      : (cb: () => void) => setTimeout(cb, 0);
  requestIdleCallback(() => {
    void flushSwipeQueue();
  });
}
