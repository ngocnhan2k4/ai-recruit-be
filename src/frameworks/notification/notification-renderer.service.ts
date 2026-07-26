import { Injectable } from "@nestjs/common";
import { Notification } from "@/core";
import { buildLanguagePriority, normalizeLanguageCode } from "@/common/utils";
import {
  NotificationTemplateContent,
  notificationTemplateRenderers,
} from "./notification-template.registry";

@Injectable()
export class NotificationRendererService {
  render(
    notification: Partial<Notification>,
    options?: {
      languagePriority?: string[];
    },
  ): NotificationTemplateContent & {
    language: string | null;
  } {
    const templateData =
      notification.templateData && typeof notification.templateData === "object"
        ? (notification.templateData as Record<string, any>)
        : {};
    const templateKey =
      notification.templateKey?.trim() ||
      (Object.keys(templateData).length > 0 && notification.type
        ? String(notification.type)
        : undefined);
    if (!templateKey) {
      return {
        title: notification.title ?? "",
        message: notification.message ?? "",
        language: notification.snapshotLanguageCode ?? null,
      };
    }

    const renderer = notificationTemplateRenderers[templateKey];
    if (!renderer) {
      return {
        title: notification.title ?? "",
        message: notification.message ?? "",
        language: notification.snapshotLanguageCode ?? null,
      };
    }

    const [primaryLanguage] = buildLanguagePriority(
      normalizeLanguageCode(options?.languagePriority?.[0]),
      normalizeLanguageCode(options?.languagePriority?.[1]),
    );
    const resolvedLanguage =
      primaryLanguage ??
      normalizeLanguageCode(notification.snapshotLanguageCode) ??
      "vi";

    const rendered = renderer({
      language: resolvedLanguage,
      data: templateData,
    });

    return {
      ...rendered,
      language: resolvedLanguage,
    };
  }
}
