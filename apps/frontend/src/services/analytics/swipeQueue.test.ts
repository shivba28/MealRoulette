/**
 * Tests for IndexedDB swipe queue: enqueue, peek, remove, queue length.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  enqueueSwipe,
  peekQueue,
  removeFromQueue,
  getQueueLength,
  clearSwipeQueue,
} from './swipeQueue';

describe('swipeQueue', () => {
  beforeEach(async () => {
    await clearSwipeQueue();
  });

  it('enqueues and peeks events in order', async () => {
    await enqueueSwipe('r1', 'right', 1000, 0.5);
    await enqueueSwipe('r2', 'left', 1001, 0.2);
    const peek = await peekQueue(10);
    expect(peek).toHaveLength(2);
    expect(peek[0]!.recipeId).toBe('r1');
    expect(peek[1]!.recipeId).toBe('r2');
    expect(peek[0]!.direction).toBe('right');
    expect(peek[1]!.direction).toBe('left');
  });

  it('getQueueLength reflects count', async () => {
    expect(await getQueueLength()).toBe(0);
    await enqueueSwipe('r1', 'right', 1000, 0);
    expect(await getQueueLength()).toBe(1);
    await enqueueSwipe('r2', 'left', 1001, 0);
    expect(await getQueueLength()).toBe(2);
  });

  it('removeFromQueue removes by id', async () => {
    await enqueueSwipe('r1', 'right', 1000, 0);
    await enqueueSwipe('r2', 'left', 1001, 0);
    const peek = await peekQueue(10);
    await removeFromQueue([peek[0]!.id]);
    expect(await getQueueLength()).toBe(1);
    const after = await peekQueue(10);
    expect(after[0]!.recipeId).toBe('r2');
  });

  it('clearSwipeQueue empties queue', async () => {
    await enqueueSwipe('r1', 'right', 1000, 0);
    await clearSwipeQueue();
    expect(await getQueueLength()).toBe(0);
    expect(await peekQueue(10)).toHaveLength(0);
  });

  it('enqueueSwipe with recipeSnapshot stores and peeks snapshot', async () => {
    const snapshot = {
      tags: ['pasta', 'chicken'],
      protein: 30,
      carbs: 40,
      fat: 10,
      calories: 350,
    };
    await enqueueSwipe('r1', 'right', 1000, 0.5, snapshot);
    const peek = await peekQueue(10);
    expect(peek).toHaveLength(1);
    expect(peek[0]!.recipeSnapshot).toEqual(snapshot);
  });
});
