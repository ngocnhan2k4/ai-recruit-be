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

// Because we use cache manager, so need maintain locks using global variable, in order to avoid multiple request hit database at the same time when cache is expired.
// If need scale, let move logic into module level, and use redis lock instead of in-memory lock.
const locks = new Set<string>();

export const cacheWithRetryBackoff = async <T>(
  key: string,
  cacher: () => Promise<T | undefined>,
  fetcher: () => Promise<T>,
  updateCacher: (data: T) => Promise<any>,
  options: RetryOptions = {},
): Promise<T> => {
  const { interval = 1000, maxAttempts = 10, maxDelay = 3_000 } = options;

  let attempt = 1;

  while (true) {
    const cached = await cacher();
    if (cached !== undefined) return cached;

    if (attempt > maxAttempts) {
      throw new Error(
        `Cache retry exceeded ${maxAttempts} attempts for key: "${key}"`,
      );
    }

    if (!locks.has(key)) {
      locks.add(key);
      try {
        const data = await fetcher();
        await updateCacher(data).catch((err) =>
          console.warn(`[cache] updateCacher failed for key "${key}":`, err),
        );
        return data;
      } finally {
        locks.delete(key);
      }
    }

    const delay =
      Math.min(interval * 2 ** (attempt - 1), maxDelay) + Math.random() * 100;
    attempt++;
    await wait(delay);
  }
};
