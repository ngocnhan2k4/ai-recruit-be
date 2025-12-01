import { EmailJob } from "../entities/email.entity";

export abstract class IEmailQueueStorageService {
  abstract addToQueue(job: EmailJob): void;

  abstract getNextJob(): EmailJob | undefined;

  abstract getAllJobs(count: number): EmailJob[];

  abstract removeJob(jobId: string): void;

  abstract updateJob(jobId: string, updates: Partial<EmailJob>): void;

  abstract getQueueSize(): number;

  abstract getQueueStats(): {
    total: number;
    pending: number;
    retrying: number;
  };

  abstract clearQueue(): void;
}
