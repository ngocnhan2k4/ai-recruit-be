import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { IJobRepository } from "@/core";
import { EmailQueueService } from "@/frameworks/email-services/email-queue.service";
import { EmailJob, EmailJobType } from "@/core/entities/email-job.entity";
import { randomUUID } from "crypto";
import { subDays } from "date-fns/subDays";

@Injectable()
export class JobMatchingUseCases {
  private readonly logger = new Logger(JobMatchingUseCases.name);

  constructor(
    private readonly jobRepository: IJobRepository,
    private readonly emailQueueService: EmailQueueService,
  ) {}

  /**
   * Tìm các job liên quan dựa trên các job user đã apply và gửi email
   */
  async sendJobRecommendationsToUsers(): Promise<void> {
    this.logger.log("Starting job recommendations email process...");

    try {
      // Lấy tất cả users đã apply job
      const usersWithAppliedJobs =
        await this.jobRepository.getUsersWithAppliedJobs();

      this.logger.log(
        `Found ${usersWithAppliedJobs.length} users with applied jobs`,
      );

      for (const user of usersWithAppliedJobs) {
        try {
          // Tìm các job liên quan
          const recommendedJobs = await this.jobRepository.findRecommendedJobs(
            user.userId,
            user.appliedJobIds,
            user.skillIds,
            user.categoryIds,
            subDays(new Date(), 1),
            new Date(),
            true,
            20,
          );

          if (recommendedJobs.length === 0) {
            this.logger.debug(
              `No recommended jobs found for user ${user.userId}`,
            );
            continue;
          }

          // Queue email job
          const emailJob: EmailJob = {
            id: randomUUID(),
            type: EmailJobType.JOB_RECOMMENDATIONS,
            data: {
              to: user.email,
              userName: user.name,
              jobs: recommendedJobs.slice(0, 10), // Giới hạn 10 jobs mỗi email
            },
            attempts: 0,
            maxAttempts: 3,
            createdAt: new Date(),
          };

          this.emailQueueService.addToQueue(emailJob);
          this.logger.log(
            `Queued job recommendations email for user ${user.userId} with ${recommendedJobs.length} jobs`,
          );
        } catch (error) {
          this.logger.error(
            `Error processing user ${user.userId}: ${error.message}`,
            error.stack,
          );
        }
      }

      this.logger.log("Job recommendations email process completed");
    } catch (error) {
      this.logger.error(
        `Error in sendJobRecommendationsToUsers: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Cron job chạy mỗi ngày lúc 8:00 AM để gửi email job recommendations
   */
  // @Cron(CronExpression.EVERY_DAY_AT_8AM)
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async scheduledJobRecommendations(): Promise<void> {
    this.logger.log("Running scheduled job recommendations cron job...");
    await this.sendJobRecommendationsToUsers();
  }
}
