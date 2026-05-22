import { EmailJobType } from "./enum.entity";
import { JobResponse } from "./job.entity";

export interface EmailJobData {
  to: string | string[];
  subject?: string;
  [key: string]: any;
}

export interface EmailJob {
  id: string;
  type: EmailJobType;
  data: EmailJobData;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  nextRetryAt?: Date;
  error?: string;
}

export interface OrganizationInvitationEmailData {
  to: string;
  organizationName: string;
  inviterName: string;
  invitationLink: string;
  role: string;
}

export interface JobRecommendationsEmailData {
  to: string;
  userName: string;
  jobs: JobResponse[];
}

export interface OrganizationVerificationEmailData {
  to: string;
  organizationName: string;
  otpCode: string;
}

export interface OrganizationChangeEmailData {
  to: string;
  organizationName: string;
  otpCode: string;
}

export class FeedbackAssignedEmailData {
  to: string;
  recipientName: string;
  feedbackSubject: string;
}

export class FeedbackResolvedEmailData {
  to: string;
  recipientName: string;
  feedbackSubject: string;
}
