import { Logger } from "@nestjs/common";
import { IBackoff } from "./backoff";

interface RetryOptions {
  retries?: number;
  interval?: number;
  maxAttempts?: number;
  maxDelay?: number;
  backoff?: IBackoff;
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const { retries = 3, interval = 1000, backoff } = options;
  const attempts = Math.max(1, retries);

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;

      const delay = backoff ? backoff.next(attempt) : interval;
      await wait(delay);
    }
  }

  throw lastError;
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
  options: { logger?: Logger } = {},
): Promise<T> => {
  const cached = await cacher();
  if (cached != null) return cached;

  if (!pendingFetches.has(key)) {
    const fetchPromise = fetcher();
    pendingFetches.set(key, fetchPromise);
    try {
      const data = await fetchPromise;
      await updateCacher(data).catch((err) => {
        const { logger } = options;
        (logger || console).warn(
          `[cache] updateCacher failed for key "${key}":`,
          err,
        );
      });
      return data;
    } finally {
      pendingFetches.delete(key);
    }
  }

  return pendingFetches.get(key);
};

export const mapWithConcurrency = async <T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  options: { concurrency?: number; continueOnError?: boolean } = {},
): Promise<R[]> => {
  const { concurrency = 10, continueOnError = false } = options;
  const workerCount = Math.min(concurrency, items.length);

  const results: R[] = new Array(items.length);
  let index = 0;

  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const currentIndex = index++;
      if (currentIndex >= items.length) break;

      try {
        results[currentIndex] = await fn(items[currentIndex]);
      } catch (error) {
        console.error(
          `Error executing function for item ${currentIndex}:`,
          error,
        );
        if (!continueOnError) throw error;
        results[currentIndex] = error as R;
      }
    }
  });

  await Promise.all(workers);
  return results;
};
