export abstract class IMessageQueueService {
  /**
   * Add an item to the queue. Items are ordered by insertion time.
   */
  abstract addJob(name: string, data: any, opts?: any): Promise<void>;
}
