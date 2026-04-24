import { Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { EMAIL_QUEUE } from "@/common/constants";
import {
  EmailJobType,
  FeedbackAssignedEmailData,
  FeedbackResolvedEmailData,
  OrganizationChangeEmailData,
} from "@/core";
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
  [EmailJobType.FEEDBACK_ASSIGNED]: FeedbackAssignedEmailData;
  [EmailJobType.FEEDBACK_RESOLVED]: FeedbackResolvedEmailData;
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
    try {
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
          this.logger.log(
            `[email.worker] [processEmailTask] Sent organization invitation email to ${orgInvite.to} for organization ${orgInvite.organizationName}`,
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
          this.logger.log(
            `[email.worker] [processEmailTask] Sent job recommendations email to ${jobRec.to} for user ${jobRec.userName}`,
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
          this.logger.log(
            `[email.worker] [processEmailTask] Sent organization verification email to ${orgVerify.to} for organization ${orgVerify.organizationName}`,
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
          this.logger.log(
            `[email.worker] [processEmailTask] Sent organization change email to ${orgChange.to} for organization ${orgChange.organizationName}`,
          );
          return;
        }
        case EmailJobType.FEEDBACK_ASSIGNED: {
          const feedbackAssigned = data as FeedbackAssignedEmailData;
          await this.emailService.sendFeedbackAssignedEmail(
            feedbackAssigned.to,
            feedbackAssigned.recipientName ?? "bạn",
            feedbackAssigned.feedbackSubject,
          );
          this.logger.log(
            `[email.worker] [processEmailTask] Sent feedback assigned email to ${feedbackAssigned.to} for feedback ${feedbackAssigned.feedbackSubject}`,
          );
          return;
        }
        case EmailJobType.FEEDBACK_RESOLVED: {
          const feedbackResolved = data as FeedbackResolvedEmailData;
          await this.emailService.sendFeedbackResolvedEmail(
            feedbackResolved.to,
            feedbackResolved.recipientName ?? "bạn",
            feedbackResolved.feedbackSubject,
          );

          this.logger.log(
            `[email.worker] [processEmailTask] Sent feedback resolved email to ${feedbackResolved.to} for feedback ${feedbackResolved.feedbackSubject}`,
          );
          return;
        }
        default:
          this.logger.warn(
            "[email.worker] [processEmailTask] Unknown email task type",
          );
      }
    } catch (error) {
      this.logger.error(
        `[email.worker] [processEmailTask] Failed to process email task of type ${type} with data ${JSON.stringify(
          data,
        )}. Error: ${error.message}`,
      );
      throw error;
    }
  }
}
