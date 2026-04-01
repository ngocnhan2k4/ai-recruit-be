export interface IBackoff {
  /**
   * @param attempt 1-based attempt number after the initial failure
   * @returns delay in milliseconds before next retry
   */
  next(attempt: number): number;
}

/**
 * "jit" backoff: exponential growth + incremental jitter to spread retries.
 */
export class JitterBackoff implements IBackoff {
  constructor(
    private readonly baseMs: number,
    private readonly maxMs: number,
    private readonly random: () => number = Math.random,
  ) {}

  next(attempt: number): number {
    const exp = this.baseMs * Math.pow(2, Math.max(0, attempt - 1));
    const capped = Math.min(this.maxMs, Math.floor(exp));
    const r = this.random();
    const jitter = Math.floor(Math.max(0, Math.min(1, r)) * capped);
    return jitter;
  }
}
