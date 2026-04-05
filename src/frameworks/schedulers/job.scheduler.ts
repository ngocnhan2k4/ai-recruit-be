import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { JobMatchingUseCases } from "@/use-cases/job-matching/job-matching.use-cases";
import { JobSyncUseCases } from "@/use-cases/job-sync/job-sync.use-case";

@Injectable()
export class JobMatchingScheduler {
  private readonly logger = new Logger(JobMatchingScheduler.name);

  constructor(
    private readonly jobMatchingUseCases: JobMatchingUseCases,
    private readonly jobSyncUseCases: JobSyncUseCases,
  ) {}

  @Cron("26 13 * * *")
  async scheduledJobRecommendations(): Promise<void> {
    this.logger.log("Running scheduled job recommendations cron job...");
    await this.jobMatchingUseCases.sendJobRecommendationsToUsers();
  }

  // Sync job every day to sync job crawled
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async syncAllActiveJobs(): Promise<void> {
    this.logger.log("Running scheduled job sync cron job...");
    await this.jobSyncUseCases.syncAllActiveJobs();
  }
}
