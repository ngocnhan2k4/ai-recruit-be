export abstract class IMessageQueueService {
  /**
   * Add an item to the queue. Items are ordered by insertion time.
   */
  abstract addJob(name: string, data: any, opts?: any): Promise<void>;

  /**
   * Add an item to the task queue.
   */
  abstract addTask(name: string, data: any, opts?: any): Promise<void>;

  /**
   * Add an item to the email queue.
   */
  abstract addEmail(name: string, data: any, opts?: any): Promise<void>;

  /**
   * Add an item to the CV extraction/index queue.
   */
  abstract addCv(name: string, data: any, opts?: any): Promise<void>;
}
