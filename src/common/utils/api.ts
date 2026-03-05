interface RetryOptions {
  retries?: number;
  interval?: number;
  maxAttempts?: number;
  maxDelay?: number;
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { retries = 3, interval = 1000 } = options;

  try {
    return await fn();
  } catch (error) {
    if (retries <= 1) throw error;

    await wait(interval);

    return retry(fn, { retries: retries - 1, interval });
  }
}

export const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// [TODO] Using redis to cache if we need scale
const pendingFetches = new Map<string, Promise<any>>();

export const cacheWithDedup = async <T>(
  key: string,
  cacher: () => Promise<T | undefined>,
  fetcher: () => Promise<T>,
  updateCacher: (data: T) => Promise<any>,
): Promise<T> => {
  const cached = await cacher();
  if (cached !== undefined) return cached;

  if (!pendingFetches.has(key)) {
    const fetchPromise = fetcher();
    pendingFetches.set(key, fetchPromise);
    try {
      const data = await fetchPromise;
      await updateCacher(data).catch((err) =>
        console.warn(`[cache] updateCacher failed for key "${key}":`, err),
      );
      return data;
    } finally {
      pendingFetches.delete(key);
    }
  }

  return pendingFetches.get(key);
};
