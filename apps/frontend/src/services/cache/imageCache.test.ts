/**
 * Tests for IndexedDB image cache (data URL storage, LRU).
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  getCachedImage,
  setCachedImage,
  getImageCacheCount,
  clearImageCache,
  resolveImageUrl,
} from './imageCache';

const DATA_URL = 'data:image/png;base64,iVBORw0KGgo=';

describe('imageCache', () => {
  beforeEach(async () => {
    await clearImageCache();
  });

  it('returns null when cache is empty', async () => {
    const got = await getCachedImage('https://example.com/a.png');
    expect(got).toBeNull();
  });

  it('stores and retrieves by url', async () => {
    await setCachedImage('https://example.com/a.png', DATA_URL);
    const got = await getCachedImage('https://example.com/a.png');
    expect(got).toBe(DATA_URL);
  });

  it('getImageCacheCount reflects count', async () => {
    expect(await getImageCacheCount()).toBe(0);
    await setCachedImage('https://example.com/a.png', DATA_URL);
    expect(await getImageCacheCount()).toBe(1);
  });

  it('clearImageCache removes all', async () => {
    await setCachedImage('https://example.com/a.png', DATA_URL);
    await clearImageCache();
    expect(await getImageCacheCount()).toBe(0);
    expect(await getCachedImage('https://example.com/a.png')).toBeNull();
  });

  it('resolveImageUrl returns cached data URL when present', async () => {
    await setCachedImage('https://example.com/b.png', DATA_URL);
    const resolved = await resolveImageUrl('https://example.com/b.png');
    expect(resolved).toBe(DATA_URL);
  });

  it('resolveImageUrl returns original url on fetch failure when not cached', async () => {
    const resolved = await resolveImageUrl('https://invalid.example/nonexistent.png');
    expect(resolved).toBe('https://invalid.example/nonexistent.png');
  });
});
