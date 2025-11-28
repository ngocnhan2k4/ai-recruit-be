import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { EmailQueueService } from "./email-queue.service";
import { EmailService } from "./email.service";
import { EmailJob, EmailJobType } from "./interfaces/email-job.interface";

@Injectable()
export class EmailWorkerService implements OnModuleInit {
  private readonly logger = new Logger(EmailWorkerService.name);
  private isProcessing = false;

  constructor(
    private readonly emailQueueService: EmailQueueService,
    private readonly emailService: EmailService,
  ) {}

  onModuleInit() {
    this.logger.log("Email Worker Service initialized");
    this.logQueueStats();
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async processQueue() {
    if (this.isProcessing) {
      return;
    }

    const jobs = this.emailQueueService.getAllJobs(20); // Lấy tối đa 20 jobs
    if (jobs.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      this.logger.log(`Processing ${jobs.length} jobs...`);

      // Process all jobs in parallel using Promise.allSettled
      const results = await Promise.allSettled(
        jobs.map(async (job) => {
          this.logger.log(
            `Processing job ${job.id} (${job.type}), attempt ${job.attempts + 1}/${job.maxAttempts}`,
          );

          await this.sendEmailByType(job);

          this.emailQueueService.removeJob(job.id);
          this.logger.log(`Job ${job.id} completed successfully`);
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

      this.logger.log(
        `Completed processing. Success: ${results.filter((r) => r.status === "fulfilled").length}, Failed: ${results.filter((r) => r.status === "rejected").length}`,
      );
    } finally {
      this.isProcessing = false;
    }
  }

  private async sendEmailByType(job: EmailJob): Promise<void> {
    switch (job.type) {
      case EmailJobType.ORGANIZATION_INVITATION:
        await this.emailService.sendOrganizationInvitationEmail(
          job.data.to as string,
          job.data.organizationName,
          job.data.inviterName,
          job.data.invitationLink,
          job.data.role,
        );
        break;

      case EmailJobType.VERIFICATION:
        await this.emailService.sendVerificationEmail(
          job.data.to as string,
          job.data.verificationLink,
        );
        break;

      case EmailJobType.PASSWORD_RESET:
        await this.emailService.sendPasswordResetEmail(
          job.data.to as string,
          job.data.resetLink,
        );
        break;

      case EmailJobType.WELCOME:
        await this.emailService.sendWelcomeEmail(
          job.data.to as string,
          job.data.userName,
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
          `[EmailService] Failed to send email: Unknown job type ${job.type as any}`,
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
      this.emailQueueService.removeJob(job.id);
    } else {
      const delaySeconds = Math.pow(2, job.attempts) * 5;
      job.nextRetryAt = new Date(Date.now() + delaySeconds * 1000);

      this.emailQueueService.updateJob(job.id, {
        attempts: job.attempts,
        nextRetryAt: job.nextRetryAt,
        error: job.error,
      });

      this.logger.warn(
        `Job ${job.id} will retry in ${delaySeconds} seconds (attempt ${job.attempts}/${job.maxAttempts})`,
      );
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  private logQueueStats() {
    const stats = this.emailQueueService.getQueueStats();
    if (stats.total > 0) {
      this.logger.log(
        `Queue stats - Total: ${stats.total}, Pending: ${stats.pending}, Retrying: ${stats.retrying}`,
      );
    }
  }
}
