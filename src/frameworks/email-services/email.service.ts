import { Injectable } from "@nestjs/common";
import { MailerService } from "@nestjs-modules/mailer";
import { ConfigService } from "@nestjs/config";
import { JobResponse } from "@/core/entities/job.entity";
import { compileTemplate } from "@/common/utils/handlebar";

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
    const roleText = role ? ` với vai trò <strong>${role}</strong>` : "";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-bottom: 20px;">Lời mời tham gia doanh nghiệp</h2>
          <p style="color: #555; line-height: 1.6;">
            <strong>${inviterName}</strong> đã mời bạn tham gia vào doanh nghiệp 
            <strong style="color: #2196F3;">${organizationName}</strong>${roleText}.
          </p>
          <p style="color: #555; line-height: 1.6;">
            Click vào nút bên dưới để chấp nhận lời mời:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${invitationLink}" 
               style="display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Chấp nhận lời mời
            </a>
          </div>
          <p style="color: #777; font-size: 14px; line-height: 1.6;">
            Hoặc copy link sau vào trình duyệt:
          </p>
          <p style="color: #2196F3; font-size: 14px; word-break: break-all;">
            ${invitationLink}
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">
            Link này sẽ hết hạn sau 7 ngày. Nếu bạn không yêu cầu lời mời này, vui lòng bỏ qua email.
          </p>
        </div>
      </div>
    `;

    await this.sendEmail({
      to,
      subject: `Lời mời tham gia ${organizationName}`,
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
      if (!min && !max) return "Thỏa thuận";
      if (min && max) {
        const minNum = parseInt(min) / 1000000;
        const maxNum = parseInt(max) / 1000000;
        return `${minNum} - ${maxNum} triệu VNĐ`;
      }
      if (min) {
        const minNum = parseInt(min) / 1000000;
        return `Từ ${minNum} triệu VNĐ`;
      }
      if (max) {
        const maxNum = parseInt(max) / 1000000;
        return `Đến ${maxNum} triệu VNĐ`;
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
}
