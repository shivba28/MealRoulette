/**
 * Fetches and displays the top YouTube search result for a recipe.
 * Fallback: "Search this recipe on YouTube" button if API fails or key missing.
 */

import { useEffect, useState } from 'react';

const YOUTUBE_SEARCH_API = 'https://www.googleapis.com/youtube/v3/search';
const YOUTUBE_WATCH_BASE = 'https://www.youtube.com/watch?v=';
const YOUTUBE_RESULTS_BASE = 'https://www.youtube.com/results?search_query=';

interface YouTubeSearchItem {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    thumbnails?: { high?: { url?: string }; default?: { url?: string }; medium?: { url?: string } };
  };
}

interface YouTubeSearchResponse {
  items?: YouTubeSearchItem[];
}

function encodeQuery(name: string): string {
  return encodeURIComponent(`${name} recipe how to make`);
}

export interface YouTubeThumbnailProps {
  recipeName: string;
}

export function YouTubeThumbnail({ recipeName }: YouTubeThumbnailProps) {
  const [state, setState] = useState<'loading' | 'success' | 'fallback'>('loading');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);

  useEffect(() => {
    const key = import.meta.env['VITE_YOUTUBE_API_KEY'] as string | undefined;
    if (!key?.trim()) {
      setState('fallback');
      return;
    }

    const query = encodeQuery(recipeName);
    const url = `${YOUTUBE_SEARCH_API}?part=snippet&q=${query}&type=video&maxResults=1&key=${key}`;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('API error');
        return res.json() as Promise<YouTubeSearchResponse>;
      })
      .then((data) => {
        const item = data.items?.[0];
        const id = item?.id?.videoId;
        const thumb = item?.snippet?.thumbnails?.high?.url ?? item?.snippet?.thumbnails?.medium?.url ?? item?.snippet?.thumbnails?.default?.url;
        const videoTitle = item?.snippet?.title ?? null;
        if (id && thumb) {
          setVideoId(id);
          setThumbnailUrl(thumb);
          setTitle(videoTitle);
          setState('success');
        } else {
          setState('fallback');
        }
      })
      .catch(() => {
        setState('fallback');
      });
  }, [recipeName]);

  const fallbackUrl = YOUTUBE_RESULTS_BASE + encodeURIComponent(`${recipeName} recipe`);

  if (state === 'loading') {
    return (
      <div className="youtube-thumbnail youtube-thumbnail--skeleton" aria-hidden>
        <div className="youtube-thumbnail__placeholder" />
      </div>
    );
  }

  if (state === 'fallback') {
    return (
      <div className="youtube-thumbnail youtube-thumbnail--fallback">
        <a
          href={fallbackUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="youtube-thumbnail__fallback-btn"
        >
          ▶ Search this recipe on YouTube
        </a>
      </div>
    );
  }

  const watchUrl = videoId ? `${YOUTUBE_WATCH_BASE}${videoId}` : fallbackUrl;

  return (
    <div className="youtube-thumbnail">
      <a
        href={watchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="youtube-thumbnail__link"
        aria-label={`Watch ${recipeName} on YouTube`}
      >
        <div className="youtube-thumbnail__aspect">
          {thumbnailUrl && (
            <img
              src={thumbnailUrl}
              alt=""
              className="youtube-thumbnail__img"
              loading="lazy"
            />
          )}
          <span className="youtube-thumbnail__play" aria-hidden>
            <PlayIcon />
          </span>
        </div>
      </a>
      {title && (
        <p className="youtube-thumbnail__title">{title}</p>
      )}
    </div>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 68 48" width="68" height="48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z" fill="red"/>
      <path d="M45 24L27 14v20" fill="white"/>
    </svg>
  );
}
