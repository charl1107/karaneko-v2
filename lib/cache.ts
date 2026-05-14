// lib/cache.ts

export async function cachedFetch<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 600 // 10 minutes default
): Promise<T> {
  const cache = caches.default;
  const url = new URL(`https://cache.karaneko/${cacheKey}`);
  const request = new Request(url.toString());

  let response = await cache.match(request);

  if (response) {
    return response.json();
  }

  const data = await fetchFn();

  response = new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `max-age=${ttlSeconds}`,
    },
  });

  // Cache in background
  if (typeof context !== 'undefined' && context.waitUntil) {
    context.waitUntil(cache.put(request, response.clone()));
  }

  return data;
}
