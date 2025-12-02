import { Injectable } from "@nestjs/common";
import { MailerService } from "@nestjs-modules/mailer";
import { ConfigService } from "@nestjs/config";
import { JobResponse } from "@/core/entities/job.entity";

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

  async sendVerifyOrganizationEmailOtp(
    to: string,
    organizationName: string,
    otp: string,
  ): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-bottom: 20px;">Xác thực email cho doanh nghiệp</h2>
          <p style="color: #555; line-height: 1.6;">
            Bạn đang cố gắng xác thực email cho doanh nghiệp 
            <strong style="color: #2196F3;">${organizationName}</strong>.
          </p>
          <p style="color: #555; line-height: 1.6;">
            Mã OTP của bạn là:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="display: inline-block; padding: 15px 25px; background-color: #2196F3; color: white; font-size: 24px; letter-spacing: 5px; border-radius: 5px; font-weight: bold;">
              ${otp}
            </span>
          </div>
          <p style="color: #777; font-size: 14px; line-height: 1.6;">
            Mã OTP này sẽ hết hạn sau 10 phút. Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email.
          </p>
        </div>
      </div>
    `;

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

    const jobsHtml = jobs
      .map((jobResponse) => {
        const job = jobResponse.job;
        const jobUrl = `${frontendUrl}/dashboard/jobs/${job.id}`;
        const salary = formatSalary(job.salaryMin, job.salaryMax);
        const skills = formatSkills(jobResponse.skills);
        const province = formatProvince(jobResponse.provinces);
        const organization = jobResponse.organization;

        return `
          <div style="border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 20px; background-color: #fafafa;">
            <h3 style="color: #2196F3; margin-top: 0; margin-bottom: 10px;">
              <a href="${jobUrl}" style="color: #2196F3; text-decoration: none;">${job.title}</a>
            </h3>
            <p style="color: #666; margin: 5px 0; font-size: 14px;">
              <strong>Công ty:</strong> ${organization.name || "N/A"}
            </p>
            <p style="color: #666; margin: 5px 0; font-size: 14px;">
              <strong>Địa điểm:</strong> ${province}
            </p>
            <p style="color: #666; margin: 5px 0; font-size: 14px;">
              <strong>Mức lương:</strong> ${salary}
            </p>
            <p style="color: #666; margin: 5px 0; font-size: 14px;">
              <strong>Kỹ năng:</strong> ${skills}
            </p>
            <div style="margin-top: 15px;">
              <a href="${jobUrl}" 
                 style="display: inline-block; padding: 8px 20px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px; font-size: 14px;">
                Xem chi tiết
              </a>
            </div>
          </div>
        `;
      })
      .join("");

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-bottom: 20px;">Việc làm phù hợp với bạn</h2>
          <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
            Xin chào <strong>${userName}</strong>,
          </p>
          <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
            Dựa trên các công việc bạn đã ứng tuyển, chúng tôi đã tìm thấy <strong>${jobs.length}</strong> việc làm phù hợp với bạn:
          </p>
          ${jobsHtml}
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Email này được gửi tự động dựa trên sở thích và lịch sử ứng tuyển của bạn.
            <br>
            Bạn có thể tắt thông báo này trong cài đặt tài khoản.
          </p>
        </div>
      </div>
    `;

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
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-bottom: 20px;">Xác thực email cho doanh nghiệp</h2>
          <p style="color: #555; line-height: 1.6;">
            Bạn đang thực hiện thay đổi email cho doanh nghiệp
            <strong style="color: #2196F3;">${organizationName}</strong>.
          </p>
          <p style="color: #555; line-height: 1.6;">
            Mã OTP của bạn là:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="display: inline-block; padding: 15px 25px; background-color: #2196F3; color: white; font-size: 24px; letter-spacing: 5px; border-radius: 5px; font-weight: bold;">
              ${otp}
            </span>
          </div>
          <p style="color: #777; font-size: 14px; line-height: 1.6;">
            Mã OTP này sẽ hết hạn sau 10 phút. Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email.
          </p>
        </div>
      </div>
    `;
    await this.sendEmail({
      to,
      subject: `Xác thực email cho ${organizationName}`,
      html,
    });
  }
}
