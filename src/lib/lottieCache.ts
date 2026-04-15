// Simple caching for Lottie animation JSON using in-memory Map and CacheStorage

const memoryCache = new Map<string, unknown>();

async function getFromCacheStorage(url: string): Promise<unknown | null> {
  try {
    if (typeof caches === "undefined") return null;
    const cache = await caches.open("lottie-cache-v1");
    const match = await cache.match(url);
    if (!match) return null;
    const json = await match.json();
    return json;
  } catch {
    return null;
  }
}

async function putInCacheStorage(url: string, response: Response): Promise<void> {
  try {
    if (typeof caches === "undefined") return;
    const cache = await caches.open("lottie-cache-v1");
    // Response bodies are one-time use; clone before caching
    await cache.put(url, response.clone());
  } catch {
    // ignore cache put errors
  }
}

async function fetchJson(url: string): Promise<{ data: unknown | null; response: Response | null }> {
  try {
    const response = await fetch(url, {
      mode: "cors",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return { data: null, response: response };
    const data = await response.clone().json();
    return { data, response };
  } catch {
    return { data: null, response: null };
  }
}

export async function fetchLottieAnimation(urls: string[]): Promise<unknown | null> {
  // Try memory cache by any matching URL first
  for (const u of urls) {
    if (memoryCache.has(u)) {
      return memoryCache.get(u);
    }
  }

  // Try CacheStorage for each URL, first one that exists wins
  for (const u of urls) {
    const cached = await getFromCacheStorage(u);
    if (cached) {
      memoryCache.set(u, cached);
      return cached;
    }
  }

  // Fetch sequentially until one succeeds; cache the first success
  for (const u of urls) {
    const { data, response } = await fetchJson(u);
    if (data) {
      memoryCache.set(u, data);
      if (response) await putInCacheStorage(u, response);
      return data;
    }
  }

  return null;
}

export function requestIdle(fn: () => void, timeout = 1500): void {
  // Use requestIdleCallback if available; otherwise fallback to setTimeout
  // @ts-expect-error - TS may not know about requestIdleCallback in DOM lib settings
  const ric: ((cb: unknown, opts?: unknown) => number) | undefined = (globalThis as unknown).requestIdleCallback;
  if (typeof ric === "function") {
    ric(fn, { timeout });
  } else {
    setTimeout(fn, 0);
  }
}


