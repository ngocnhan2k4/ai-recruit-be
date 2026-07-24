import { Injectable } from "@nestjs/common";
import { MailerService } from "@nestjs-modules/mailer";
import { ConfigService } from "@nestjs/config";
import { JobResponse } from "@/core/entities/job.entity";
import { compileTemplate } from "@/common/utils";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

@Injectable()
export class EmailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async sendEmail(options: SendEmailOptions): Promise<void> {
    await this.mailerService.sendMail({
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      from: options.from,
    });
  }

  async sendOrganizationInvitationEmail(
    to: string,
    organizationName: string,
    inviterName: string,
    invitationLink: string,
    role?: string,
  ): Promise<void> {
    const html = compileTemplate("organization-invitation.hbs", {
      inviterName,
      organizationName,
      invitationLink,
      role,
    });

    await this.sendEmail({
      to,
      subject: `Lời mời tham gia ${organizationName}`,
      html,
    });
  }

  async sendVerifyOrganizationEmailOtp(
    to: string,
    organizationName: string,
    otp: string,
  ): Promise<void> {
    const html = compileTemplate("organization-verification.hbs", {
      organizationName,
      otp,
    });

    await this.sendEmail({
      to,
      subject: `Xác thực email cho ${organizationName}`,
      html,
    });
  }

  async sendJobRecommendationsEmail(
    to: string,
    userName: string,
    jobs: JobResponse[],
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL")!;

    const formatSalary = (min: string | null, max: string | null): string => {
      // Job salaries are stored in triệu VND (e.g. 15 = 15 triệu)
      if (!min && !max) return "Thỏa thuận";
      if (min && max) {
        return `${min} - ${max} triệu`;
      }
      if (min) {
        return `Từ ${min} triệu`;
      }
      if (max) {
        return `Đến ${max} triệu`;
      }
      return "Thỏa thuận";
    };

    const formatSkills = (skills: any[]): string => {
      if (!skills || skills.length === 0) return "Không yêu cầu";
      return skills
        .slice(0, 5)
        .map((s) => s.name as string)
        .join(", ");
    };

    const formatProvince = (provinces: any[]): string => {
      if (!provinces || provinces.length === 0) return "Không xác định";
      return provinces.map((p) => p.name as string).join(", ");
    };

    const jobsData = jobs.map((j) => {
      const job = j.job;

      return {
        job,
        jobUrl: `${frontendUrl}/dashboard/jobs/${job.id}`,
        organization: j.organization.name,
        province: formatProvince(j.provinces),
        salary: formatSalary(job.salaryMin, job.salaryMax),
        skills: formatSkills(j.skills || []),
      };
    });

    const html = compileTemplate("job-recommend.hbs", {
      userName,
      jobCount: jobs.length,
      jobs: jobsData,
    });

    await this.sendEmail({
      to,
      subject: `Việc làm phù hợp với bạn - ${jobs.length} công việc mới`,
      html,
    });
  }

  async sendChangeOrganizationEmailOtp(
    to: string,
    organizationName: string,
    otp: string,
  ): Promise<void> {
    const html = compileTemplate("organization-change-email.hbs", {
      organizationName,
      otp,
    });

    await this.sendEmail({
      to,
      subject: `Xác thực email cho ${organizationName}`,
      html,
    });
  }

  async sendFeedbackResolvedEmail(
    to: string,
    recipientName: string,
    feedbackSubject: string,
    resolutionNote?: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL") ?? "";
    const note = resolutionNote?.trim() || undefined;
    const html = compileTemplate("feedback-resolved.hbs", {
      recipientName,
      feedbackSubject,
      resolutionNote: note,
      frontendUrl: frontendUrl.replace(/\/$/, ""),
    });

    const noteText = note ? `\n\nGhi chú từ đội ngũ hỗ trợ:\n${note}` : "";
    await this.sendEmail({
      to,
      subject: "Feedback của bạn đã được xử lý",
      html,
      text: `Phản hồi "${feedbackSubject}" của bạn đã được xử lý.${noteText}\n\nTruy cập: ${frontendUrl}`,
    });
  }

  async sendFeedbackAssignedEmail(
    to: string,
    recipientName: string,
    feedbackSubject: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL") ?? "";
    const adminFeedbacksUrl = `${frontendUrl.replace(/\/$/, "")}/admin/feedbacks`;
    const html = compileTemplate("feedback-assigned.hbs", {
      recipientName,
      feedbackSubject,
      adminFeedbacksUrl,
    });
    await this.sendEmail({
      to,
      subject: "Bạn được giao xử lý feedback",
      html,
      text: `Bạn được giao xử lý feedback: ${feedbackSubject}. ${adminFeedbacksUrl}`,
    });
  }

  async sendAdminBulkEmail(
    to: string,
    subject: string,
    bodyHtml: string,
    recipientName: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>("FRONTEND_URL") ?? "";
    const html = compileTemplate("admin-bulk.hbs", {
      recipientName: recipientName || "bạn",
      bodyHtml,
      frontendUrl: frontendUrl.replace(/\/$/, ""),
    });

    await this.sendEmail({
      to,
      subject,
      html,
      text: bodyHtml.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, ""),
    });
  }
}
