import { EmailJob } from "../entities/email.entity";

export abstract class IEmailQueueStorageService {
  abstract addToQueue(job: EmailJob): void;

  abstract getAllJobsAsync(count: number): Promise<EmailJob[]>;

  abstract removeJob(jobId: string): void;

  abstract updateJob(jobId: string, updates: Partial<EmailJob>): void;

  abstract getQueueSizeAsync(): Promise<number>;

  abstract clearQueue(): void;
}
