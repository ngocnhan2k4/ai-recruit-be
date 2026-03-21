import { Injectable, Logger } from "@nestjs/common";
import { IEmailQueueStorageService } from "@/core/abstracts/email-queue-storage.abstract";
import { EmailJob } from "@/core/entities/email.entity";

@Injectable()
export class InMemoryEmailQueueStorageService implements IEmailQueueStorageService {
  private readonly logger = new Logger(InMemoryEmailQueueStorageService.name);
  private queue: EmailJob[] = [];

  addToQueue(job: EmailJob): void {
    this.queue.push(job);
    this.logger.log(
      `Added job ${job.id} (${job.type}) to queue. Queue size: ${this.queue.length}`,
    );
  }

  getAllJobsAsync(count: number): Promise<EmailJob[]> {
    const jobs = this.queue.slice(0, count);
    return Promise.resolve(jobs);
  }

  removeJob(jobId: string): void {
    const index = this.queue.findIndex((j) => j.id === jobId);
    if (index !== -1) {
      const job = this.queue[index];
      this.queue.splice(index, 1);
      this.logger.log(
        `Removed job ${jobId} (${job.type}). Queue size: ${this.queue.length}`,
      );
    }
  }

  updateJob(jobId: string, updates: Partial<EmailJob>): void {
    const job = this.queue.find((j) => j.id === jobId);
    if (job) {
      Object.assign(job, updates);
      this.logger.debug(`Updated job ${jobId} with updates:`, updates);
    }
  }

  getQueueSizeAsync(): Promise<number> {
    return Promise.resolve(this.queue.length);
  }

  clearQueue(): void {
    const size = this.queue.length;
    this.queue = [];
    this.logger.warn(`Cleared queue. Removed ${size} jobs.`);
  }
}
