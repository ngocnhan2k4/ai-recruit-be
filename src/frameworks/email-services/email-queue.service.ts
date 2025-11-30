import { Injectable, Logger } from "@nestjs/common";
import { EmailJob } from "./interfaces/email-job.interface";

@Injectable()
export class EmailQueueService {
  private readonly logger = new Logger(EmailQueueService.name);
  private queue: EmailJob[] = [];

  addToQueue(job: EmailJob): void {
    this.queue.push(job);
    this.logger.log(
      `Added job ${job.id} (${job.type}) to queue. Queue size: ${this.queue.length}`,
    );
  }

  getNextJob(): EmailJob | undefined {
    const now = new Date();
    const job = this.queue.find((j) => !j.nextRetryAt || j.nextRetryAt <= now);
    return job;
  }

  getAllJobs(count: number = 10): EmailJob[] {
    const now = new Date();
    const jobs = this.queue
      .filter((j) => !j.nextRetryAt || j.nextRetryAt <= now)
      .slice(0, count);
    return jobs;
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
    }
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  getQueueStats(): {
    total: number;
    pending: number;
    retrying: number;
  } {
    const now = new Date();
    const retrying = this.queue.filter(
      (j) => j.nextRetryAt && j.nextRetryAt > now,
    ).length;

    return {
      total: this.queue.length,
      pending: this.queue.length - retrying,
      retrying,
    };
  }

  clearQueue(): void {
    const size = this.queue.length;
    this.queue = [];
    this.logger.warn(`Cleared queue. Removed ${size} jobs.`);
  }
}
