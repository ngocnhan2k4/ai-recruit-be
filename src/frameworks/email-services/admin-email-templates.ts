import { AdminEmailTemplateId } from "@/core/entities/enum.entity";

export interface AdminEmailTemplate {
  id: AdminEmailTemplateId;
  label: string;
  defaultSubject: string;
  defaultBody: string;
}

export const ADMIN_EMAIL_TEMPLATES: AdminEmailTemplate[] = [
  {
    id: AdminEmailTemplateId.SYSTEM_ANNOUNCEMENT,
    label: "Thông báo hệ thống",
    defaultSubject: "Thông báo từ AIRecruit",
    defaultBody: `Chúng tôi muốn gửi đến bạn một thông báo quan trọng từ hệ thống.

Nội dung thông báo sẽ được cập nhật tại đây.

Cảm ơn bạn đã đồng hành cùng AIRecruit.`,
  },
  {
    id: AdminEmailTemplateId.SUBSCRIPTION_PROMO,
    label: "Khuyến mãi gói",
    defaultSubject: "Ưu đãi đặc biệt dành cho bạn",
    defaultBody: `Chúng tôi có chương trình ưu đãi gói subscription dành riêng cho bạn.

Hãy đăng nhập để xem chi tiết và nhận ưu đãi trước khi hết hạn.

Cảm ơn bạn đã tin tưởng AI Recruit.`,
  },
  {
    id: AdminEmailTemplateId.RENEWAL_REMINDER,
    label: "Nhắc gia hạn",
    defaultSubject: "Nhắc nhở gia hạn gói subscription",
    defaultBody: `Gói subscription của bạn sắp hết hạn.

Vui lòng gia hạn sớm để tiếp tục sử dụng đầy đủ tính năng trên AI Recruit.

Nếu bạn đã gia hạn, vui lòng bỏ qua email này.`,
  },
];

export const ADMIN_BULK_EMAIL_RECIPIENT_CAP = 1000;

export function getAdminEmailTemplate(
  id: AdminEmailTemplateId,
): AdminEmailTemplate | undefined {
  return ADMIN_EMAIL_TEMPLATES.find((t) => t.id === id);
}

/** Escape HTML then convert light markdown + newlines for email body. */
export function plainTextBodyToHtml(body: string): string {
  let html = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
  html = html.replace(
    /^### (.+)$/gm,
    '<h3 style="margin:12px 0 8px;color:#333;">$1</h3>',
  );
  html = html.replace(
    /^## (.+)$/gm,
    '<h2 style="margin:14px 0 8px;color:#333;">$1</h2>',
  );
  html = html.replace(
    /^# (.+)$/gm,
    '<h1 style="margin:16px 0 8px;color:#333;">$1</h1>',
  );
  html = html.replace(/\r\n|\r|\n/g, "<br>");

  return html;
}

export function substitutePlaceholders(
  template: string,
  vars: { name: string; email: string },
): string {
  return template
    .replace(/\{\{\s*name\s*\}\}/g, vars.name)
    .replace(/\{\{\s*email\s*\}\}/g, vars.email);
}
