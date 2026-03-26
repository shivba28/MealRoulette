/**
 * Tests for batch sender: flush sends queued events when online; offline skips send.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { enqueueSwipe, clearSwipeQueue, getQueueLength } from './swipeQueue';
import { flushSwipeQueue } from './analyticsSender';

describe('analyticsSender', () => {
  beforeEach(async () => {
    await clearSwipeQueue();
    vi.restoreAllMocks();
  });

  it('flushSwipeQueue sends batch when online and queue has events', async () => {
    await enqueueSwipe('r1', 'right', 1000, 0.5);
    await enqueueSwipe('r2', 'left', 1001, 0.2);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 204,
    } as Response);
    await flushSwipeQueue();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0]!;
    expect(url).toContain('/api/analytics/swipes');
    expect(options?.method).toBe('POST');
    const body = JSON.parse((options?.body as string) ?? '{}');
    expect(body.events).toHaveLength(2);
    expect(body.events[0]).toMatchObject({ recipeId: 'r1', direction: 'right' });
    expect(body.events[1]).toMatchObject({ recipeId: 'r2', direction: 'left' });
    const len = await getQueueLength();
    expect(len).toBe(0);
  });

  it('flushSwipeQueue does not send when queue is empty', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 204,
    } as Response);
    await flushSwipeQueue();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
