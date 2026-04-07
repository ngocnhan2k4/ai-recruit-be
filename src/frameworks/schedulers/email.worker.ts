import { Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { EMAIL_QUEUE } from "@/common/constants";
import { EmailJobType, OrganizationChangeEmailData } from "@/core";
import { EmailService } from "@/frameworks/email-services/email.service";
import {
  JobRecommendationsEmailData,
  OrganizationInvitationEmailData,
  OrganizationVerificationEmailData,
} from "@/core";

type EmailJobDataMap = {
  [EmailJobType.ORGANIZATION_INVITATION]: OrganizationInvitationEmailData;
  [EmailJobType.JOB_RECOMMENDATIONS]: JobRecommendationsEmailData;
  [EmailJobType.ORGANIZATION_VERIFICATION]: OrganizationVerificationEmailData;
  [EmailJobType.ORGANIZATION_CHANGE_EMAIL]: OrganizationChangeEmailData;
};

type EmailJobData = EmailJobDataMap[keyof EmailJobDataMap];

@Processor(EMAIL_QUEUE, {
  concurrency: 1, // This is a normal queue, so we need to limit the concurrency to 1
})
export class EmailWorker extends WorkerHost {
  private readonly logger = new Logger(EmailWorker.name);

  constructor(private readonly emailService: EmailService) {
    super();
  }

  async process(job: Job<EmailJobData, void, EmailJobType>) {
    return this.processEmailTask(job.name, job.data);
  }

  private async processEmailTask(type: EmailJobType, data: EmailJobData) {
    switch (type) {
      case EmailJobType.ORGANIZATION_INVITATION: {
        const orgInvite = data as OrganizationInvitationEmailData;
        await this.emailService.sendOrganizationInvitationEmail(
          orgInvite.to,
          orgInvite.organizationName,
          orgInvite.inviterName,
          orgInvite.invitationLink,
          orgInvite.role,
        );
        return;
      }
      case EmailJobType.JOB_RECOMMENDATIONS: {
        const jobRec = data as JobRecommendationsEmailData;
        await this.emailService.sendJobRecommendationsEmail(
          jobRec.to,
          jobRec.userName,
          jobRec.jobs,
        );
        return;
      }
      case EmailJobType.ORGANIZATION_VERIFICATION: {
        const orgVerify = data as OrganizationVerificationEmailData;
        await this.emailService.sendVerifyOrganizationEmailOtp(
          orgVerify.to,
          orgVerify.organizationName,
          orgVerify.otpCode,
        );
        return;
      }
      case EmailJobType.ORGANIZATION_CHANGE_EMAIL: {
        const orgChange = data as OrganizationChangeEmailData;
        await this.emailService.sendChangeOrganizationEmailOtp(
          orgChange.to,
          orgChange.organizationName,
          orgChange.otpCode,
        );
        return;
      }
      default:
        this.logger.warn("[processEmailTask] Unknown email task type");
    }
  }
}
