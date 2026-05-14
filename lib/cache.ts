// lib/cache.ts
import { unstable_cache } from 'next/cache';

export const CACHE_TAGS = {
  trending: 'trending-songs',
  leaderboard: 'leaderboard',
  search: 'youtube-search',
  lyrics: 'song-lyrics',
  rooms: 'active-rooms',
} as const;

/**
 * Cached fetch with Next.js unstable_cache + Cloudflare compatibility
 */
export async function cachedFetch<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  revalidateSeconds: number = 300, // 5 minutes default
  tags: string[] = []
): Promise<T> {
  return unstable_cache(
    fetchFn,
    [cacheKey],
    {
      revalidate: revalidateSeconds,
      tags: [...tags, cacheKey],
    }
  )();
}

/** Common cache configurations */
export const CACHE_TIMES = {
  search: 180,        // 3 minutes
  lyrics: 3600,       // 1 hour
  trending: 60,       // 1 minute
  leaderboard: 30,    // 30 seconds
  rooms: 15,          // 15 seconds (more dynamic)
} as const;
