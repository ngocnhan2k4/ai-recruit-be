import { EmailJobType } from "./enum.entity";

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
