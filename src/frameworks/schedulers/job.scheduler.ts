import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { JobMatchingUseCases } from "@/use-cases/job-matching/job-matching.use-cases";

@Injectable()
export class JobMatchingScheduler {
  private readonly logger = new Logger(JobMatchingScheduler.name);

  constructor(private readonly jobMatchingUseCases: JobMatchingUseCases) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async scheduledJobRecommendations(): Promise<void> {
    this.logger.log("Running scheduled job recommendations cron job...");
    await this.jobMatchingUseCases.sendJobRecommendationsToUsers();
  }
}
