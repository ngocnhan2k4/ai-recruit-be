import { Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { EMAIL_QUEUE } from "@/common/constants";
import { EmailJobType } from "@/core";
import { EmailService } from "@/frameworks/email-services/email.service";
import { JobResponse } from "@/core/entities/job.entity";

@Processor(EMAIL_QUEUE, {
  concurrency: 1, // This is a normal queue, so we need to limit the concurrency to 1
})
export class EmailWorker extends WorkerHost {
  private readonly logger = new Logger(EmailWorker.name);

  constructor(private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job) {
    return this.processEmailTask(job.name as EmailJobType, job.data);
  }

  private async processEmailTask(type: EmailJobType, data: any) {
    const getFirstEmail = (to: string | string[]): string => {
      return Array.isArray(to) ? to[0] : String(to);
    };

    switch (type) {
      case EmailJobType.ORGANIZATION_INVITATION:
        await this.emailService.sendOrganizationInvitationEmail(
          getFirstEmail(data.to),
          data.organizationName,
          data.inviterName,
          data.invitationLink,
          data.role,
        );
        return;
      case EmailJobType.JOB_RECOMMENDATIONS:
        await this.emailService.sendJobRecommendationsEmail(
          data.to as string,
          data.userName as string,
          data.jobs as JobResponse[],
        );
        return;
      case EmailJobType.ORGANIZATION_VERIFICATION:
        await this.emailService.sendVerifyOrganizationEmailOtp(
          getFirstEmail(data.to),
          data.organizationName,
          data.otpCode,
        );
        return;
      case EmailJobType.ORGANIZATION_CHANGE_EMAIL:
        await this.emailService.sendChangeOrganizationEmailOtp(
          getFirstEmail(data.to),
          data.organizationName,
          data.otpCode,
        );
        return;
      case EmailJobType.CUSTOM:
        await this.emailService.sendEmail({
          to: data.to,
          subject: data.subject || "Notification",
          html: data.html,
          text: data.text,
        });
        return;
      default:
        this.logger.warn("[processEmailTask] Unknown email task type");
    }
  }
}
