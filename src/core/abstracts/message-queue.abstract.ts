export abstract class IMessageQueueService {
  /**
   * Add an item to the queue. Items are ordered by insertion time.
   */
  abstract add(item: string, queueKey?: string): Promise<void>;

  /**
   * Remove an item from the queue (no-op if it does not exist).
   */
  abstract remove(item: string, queueKey?: string): Promise<void>;

  /**
   * Get the next item in the queue without removing it.
   */
  abstract getNext(queueKey?: string): Promise<string | null>;

  /**
   * Get the total size of the queue.
   */
  abstract size(queueKey?: string): Promise<number>;

  /**
   * Clear all items from the queue.
   */
  abstract clear(queueKey?: string): Promise<void>;
}
