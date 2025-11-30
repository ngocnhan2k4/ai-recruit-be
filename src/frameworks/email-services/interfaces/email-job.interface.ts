export enum EmailJobType {
  ORGANIZATION_INVITATION = "organization_invitation",
  VERIFICATION = "verification",
  PASSWORD_RESET = "password_reset",
  WELCOME = "welcome",
  CUSTOM = "custom",
}

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
