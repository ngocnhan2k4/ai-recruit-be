import { Injectable } from "@nestjs/common";
import { MailerService } from "@nestjs-modules/mailer";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

@Injectable()
export class EmailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendEmail(options: SendEmailOptions): Promise<void> {
    await this.mailerService.sendMail({
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      from: options.from,
    });
  }

  async sendVerificationEmail(
    to: string,
    verificationLink: string,
  ): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Xác thực tài khoản</h2>
        <p>Vui lòng click vào link bên dưới để xác thực tài khoản của bạn:</p>
        <a href="${verificationLink}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
          Xác thực tài khoản
        </a>
        <p>Hoặc copy link sau vào trình duyệt:</p>
        <p>${verificationLink}</p>
        <p>Link này sẽ hết hạn sau 24 giờ.</p>
      </div>
    `;

    await this.sendEmail({
      to,
      subject: "Xác thực tài khoản",
      html,
    });
  }

  async sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Đặt lại mật khẩu</h2>
        <p>Bạn đã yêu cầu đặt lại mật khẩu. Click vào link bên dưới để tiếp tục:</p>
        <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px;">
          Đặt lại mật khẩu
        </a>
        <p>Hoặc copy link sau vào trình duyệt:</p>
        <p>${resetLink}</p>
        <p>Link này sẽ hết hạn sau 1 giờ.</p>
        <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
      </div>
    `;

    await this.sendEmail({
      to,
      subject: "Đặt lại mật khẩu",
      html,
    });
  }

  async sendWelcomeEmail(to: string, userName: string): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Chào mừng ${userName}!</h2>
        <p>Cảm ơn bạn đã đăng ký tài khoản.</p>
        <p>Chúc bạn có trải nghiệm tuyệt vời!</p>
      </div>
    `;

    await this.sendEmail({
      to,
      subject: "Chào mừng bạn đến với hệ thống",
      html,
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
}
