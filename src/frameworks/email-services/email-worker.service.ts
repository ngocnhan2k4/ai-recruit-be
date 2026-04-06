import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { EmailJobType, IEmailQueueStorageService } from "@/core";
import { EmailService } from "./email.service";
import { JobResponse } from "@/core/entities/job.entity";
import { EmailJob } from "@/core/entities/email.entity";

@Injectable()
export class EmailWorkerService implements OnModuleInit {
  private readonly logger = new Logger(EmailWorkerService.name);
  private isProcessing = false;

  constructor(
    private readonly emailQueueStorage: IEmailQueueStorageService,
    private readonly emailService: EmailService,
  ) {}

  onModuleInit() {
    this.logger.log("Email Worker Service initialized");
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async processQueue() {
    if (this.isProcessing) {
      return;
    }

    // Support both sync and async storage implementations
    const jobs = await this.emailQueueStorage.getAllJobsAsync(20);

    if (jobs.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Process all jobs in parallel using Promise.allSettled
      const results = await Promise.allSettled(
        jobs.map(async (job) => {
          await this.sendEmailByType(job);
          this.emailQueueStorage.removeJob(job.id);
          return job;
        }),
      );

      // Handle results
      results.forEach((result, index) => {
        const job = jobs[index];
        if (result.status === "rejected") {
          this.logger.error(
            `Job ${job.id} failed: ${result.reason?.message}`,
            result.reason?.stack,
          );
          this.handleFailedJob(job, result.reason);
        }
      });
    } finally {
      this.isProcessing = false;
    }
  }

  private async sendEmailByType(job: EmailJob): Promise<void> {
    // Helper to get single email address (methods only accept string, not array)
    const getFirstEmail = (to: string | string[]): string => {
      return Array.isArray(to) ? to[0] : String(to);
    };

    switch (job.type) {
      case EmailJobType.ORGANIZATION_INVITATION:
        await this.emailService.sendOrganizationInvitationEmail(
          getFirstEmail(job.data.to),
          job.data.organizationName,
          job.data.inviterName,
          job.data.invitationLink,
          job.data.role,
        );
        break;

      case EmailJobType.JOB_RECOMMENDATIONS:
        await this.emailService.sendJobRecommendationsEmail(
          job.data.to as string,
          job.data.userName as string,
          job.data.jobs as JobResponse[],
        );
        break;

      case EmailJobType.ORGANIZATION_VERIFICATION:
        await this.emailService.sendVerifyOrganizationEmailOtp(
          getFirstEmail(job.data.to),
          job.data.organizationName,
          job.data.otpCode,
        );
        break;

      case EmailJobType.ORGANIZATION_CHANGE_EMAIL:
        await this.emailService.sendChangeOrganizationEmailOtp(
          getFirstEmail(job.data.to),
          job.data.organizationName,
          job.data.otpCode,
        );
        break;

      case EmailJobType.FEEDBACK_ASSIGNED:
        await this.emailService.sendFeedbackAssignedEmail(
          getFirstEmail(job.data.to),
          String(job.data.recipientName ?? "bạn"),
          String(job.data.feedbackSubject),
        );
        break;

      case EmailJobType.CUSTOM:
        await this.emailService.sendEmail({
          to: job.data.to,
          subject: job.data.subject || "Notification",
          html: job.data.html,
          text: job.data.text,
        });
        break;

      default:
        throw new Error(
          "[EmailService] Failed to send email: Unknown job type",
        );
    }
  }

  private handleFailedJob(job: EmailJob, error: any): void {
    job.attempts++;
    job.error = error.message;

    if (job.attempts >= job.maxAttempts) {
      this.logger.error(
        `Job ${job.id} exceeded max attempts (${job.maxAttempts}). Removing from queue.`,
      );
      this.emailQueueStorage.removeJob(job.id);
    } else {
      const delaySeconds = Math.pow(2, job.attempts) * 5;
      job.nextRetryAt = new Date(Date.now() + delaySeconds * 1000);

      this.emailQueueStorage.updateJob(job.id, {
        attempts: job.attempts,
        nextRetryAt: job.nextRetryAt,
        error: job.error,
      });

      this.logger.warn(
        `Job ${job.id} will retry in ${delaySeconds} seconds (attempt ${job.attempts}/${job.maxAttempts})`,
      );
    }
  }
}
