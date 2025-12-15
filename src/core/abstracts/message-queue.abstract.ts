export abstract class IMessageQueueService {
  /**
   * Add an item to the queue. Items are ordered by insertion time.
   */
  abstract add(item: string, queueKey?: string): Promise<void>;

  /**
   * Get the total size of the queue.
   */
  abstract size(queueKey?: string): Promise<number>;

  /**
   * Clear all items from the queue.
   */
  abstract clear(queueKey?: string): Promise<void>;

  /**
   * Pop a batch of items from the queue.
   */
  abstract popBatch(queueKey?: string, batchSize?: number): Promise<string[]>;
}
