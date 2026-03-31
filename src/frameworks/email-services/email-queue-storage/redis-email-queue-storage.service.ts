import { Injectable, Logger } from "@nestjs/common";
import { IEmailQueueStorageService } from "@/core/abstracts/email-queue-storage.abstract";
import { EmailJob } from "@/core/entities/email.entity";
import { ICacheService } from "@/core/abstracts/cache.abstract";

// [TODO] Move this to use message queue
@Injectable()
export class RedisEmailQueueStorageService implements IEmailQueueStorageService {
  private readonly logger = new Logger(RedisEmailQueueStorageService.name);
  private readonly QUEUE_KEY = "email:queue";

  constructor(private readonly redisService: ICacheService) {}

  addToQueue(job: EmailJob): void {
    // Use fire-and-forget pattern for non-blocking
    void this.addToQueueAsync(job);
  }

  private async addToQueueAsync(job: EmailJob): Promise<void> {
    try {
      // Use sorted set with timestamp as score for priority
      // Jobs with earlier nextRetryAt have higher priority
      const score = job.nextRetryAt ? job.nextRetryAt.getTime() : Date.now();

      await this.redisService.addToSortedSet(
        this.QUEUE_KEY,
        score,
        JSON.stringify(job),
      );

      this.logger.log(
        `Added job ${job.id} (${job.type}) to Redis queue. Score: ${score}`,
      );
    } catch (error) {
      this.logger.error(`Failed to add job ${job.id} to Redis queue`, error);
    }
  }

  async getAllJobsAsync(count: number = 10): Promise<EmailJob[]> {
    const now = Date.now();

    // Get jobs with score <= now (ready to process)
    const jobStrings = await this.redisService.getRangeBySortedSetScore(
      this.QUEUE_KEY,
      0,
      now,
      count,
    );

    const jobs: EmailJob[] = [];

    for (const jobStr of jobStrings) {
      try {
        const job: EmailJob = JSON.parse(jobStr);
        // Parse dates back from JSON
        job.createdAt = new Date(job.createdAt);
        if (job.nextRetryAt) {
          job.nextRetryAt = new Date(job.nextRetryAt);
        }
        jobs.push(job);
      } catch (error) {
        this.logger.error("Failed to parse job from Redis", error);
      }
    }

    return jobs;
  }

  removeJob(jobId: string): void {
    // Use fire-and-forget pattern
    void this.removeJobAsync(jobId);
  }

  private async removeJobAsync(jobId: string): Promise<void> {
    try {
      // Find and remove job by ID
      const allJobs = await this.redisService.getSortedSetRange(
        this.QUEUE_KEY,
        0,
        -1,
      );

      for (const jobStr of allJobs) {
        try {
          const job: EmailJob = JSON.parse(jobStr);
          if (job.id === jobId) {
            await this.redisService.removeFromSortedSet(this.QUEUE_KEY, jobStr);
            this.logger.log(`Removed job ${jobId} from Redis queue`);
            break;
          }
        } catch (_err) {
          // Skip invalid JSON
          continue;
        }
      }
    } catch (error) {
      this.logger.error(`Failed to remove job ${jobId} from Redis`, error);
    }
  }

  updateJob(jobId: string, updates: Partial<EmailJob>): void {
    // Use fire-and-forget pattern
    void this.updateJobAsync(jobId, updates);
  }

  private async updateJobAsync(
    jobId: string,
    updates: Partial<EmailJob>,
  ): Promise<void> {
    try {
      const allJobs = await this.redisService.getSortedSetRange(
        this.QUEUE_KEY,
        0,
        -1,
      );

      for (const jobStr of allJobs) {
        try {
          const job: EmailJob = JSON.parse(jobStr);
          if (job.id === jobId) {
            // Remove old job
            await this.redisService.removeFromSortedSet(this.QUEUE_KEY, jobStr);

            // Add updated job
            const updatedJob = { ...job, ...updates };
            const score = updatedJob.nextRetryAt
              ? updatedJob.nextRetryAt.getTime()
              : Date.now();

            await this.redisService.addToSortedSet(
              this.QUEUE_KEY,
              score,
              JSON.stringify(updatedJob),
            );

            this.logger.debug(`Updated job ${jobId} in Redis queue`);
            break;
          }
        } catch (_err) {
          continue;
        }
      }
    } catch (error) {
      this.logger.error(`Failed to update job ${jobId} in Redis`, error);
    }
  }

  async getQueueSizeAsync(): Promise<number> {
    return await this.redisService.getSortedSetSize(this.QUEUE_KEY);
  }

  async getQueueStatsAsync(): Promise<{
    total: number;
    pending: number;
    retrying: number;
  }> {
    const now = Date.now();

    const total = await this.redisService.getSortedSetSize(this.QUEUE_KEY);
    const pending = await this.redisService.countSortedSetByScore(
      this.QUEUE_KEY,
      0,
      now,
    );
    const retrying = total - pending;

    return { total, pending, retrying };
  }

  clearQueue(): void {
    // Use fire-and-forget pattern
    void this.clearQueueAsync();
  }

  private async clearQueueAsync(): Promise<void> {
    try {
      const size = await this.redisService.getSortedSetSize(this.QUEUE_KEY);
      await this.redisService.del(this.QUEUE_KEY);
      this.logger.warn(`Cleared Redis email queue. Removed ${size} jobs.`);
    } catch (error) {
      this.logger.error("Failed to clear Redis email queue", error);
    }
  }
}
