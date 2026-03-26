/**
 * Resolves an image URL via IndexedDB cache first, then network.
 * Returns the URL to use in <img src> (data URL when cached, or original/resolved URL).
 * Does not block first paint: starts with original URL and updates when cache resolves.
 */

import { useState, useEffect } from 'react';
import { resolveImageUrl } from '@/services/cache/imageCache';

/**
 * Returns the URL to use for <img src> and whether we're still resolving (cache/network).
 * When imageUrl is empty, returns [null, false]. Otherwise returns [url, isLoading].
 * First paint uses imageUrl; when cache hit or fetch completes we update to data URL or keep imageUrl.
 */
export function useCachedImageUrl(imageUrl: string | undefined): {
  src: string | null;
  isLoading: boolean;
} {
  const effective = imageUrl?.trim() || undefined;
  const [src, setSrc] = useState<string | null>(effective ?? null);
  const [isLoading, setIsLoading] = useState(!!effective);

  useEffect(() => {
    if (!effective) {
      setSrc(null);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setSrc(effective);
    setIsLoading(true);
    resolveImageUrl(effective)
      .then((resolved) => {
        if (!cancelled) {
          setSrc(resolved);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSrc(effective);
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [effective]);

  return { src, isLoading };
}
