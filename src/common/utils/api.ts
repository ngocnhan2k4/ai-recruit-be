interface RetryOptions {
  retries?: number;
  interval?: number;
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
