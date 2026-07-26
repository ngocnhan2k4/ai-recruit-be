import Handlebars from "handlebars";

export type NotificationTemplateContent = {
  title: string;
  message: string;
};

export type NotificationTemplateRenderer = (params: {
  language: string;
  data: Record<string, any>;
}) => NotificationTemplateContent;

const DEFAULT_LANGUAGE = "vi";

const selectLanguage = (
  language: string,
  variants: Partial<Record<string, string>>,
): string => variants[language] ?? variants[DEFAULT_LANGUAGE] ?? "";

const renderString = (template: string, data: Record<string, any>) =>
  Handlebars.compile(template, {
    noEscape: true,
  })(data);

const buildSimpleRenderer = (config: {
  title: Partial<Record<string, string>>;
  message: Partial<Record<string, string>>;
}): NotificationTemplateRenderer => {
  return ({ language, data }) => ({
    title: renderString(selectLanguage(language, config.title), data),
    message: renderString(selectLanguage(language, config.message), data),
  });
};

const buildBlogCommentAggregatedRenderer: NotificationTemplateRenderer = ({
  language,
  data,
}) => {
  const actorNames = Array.isArray(data.actorNames)
    ? data.actorNames.filter((value) => typeof value === "string")
    : [];
  const actorCount = Number(data.actorCount) || actorNames.length || 1;
  const others = Math.max(0, actorCount - actorNames.length);
  const postTitle = data.postTitle ?? "bài viết";
  const firstActor = actorNames[0] ?? "Người dùng";
  const secondActor = actorNames[1] ?? "Người dùng";

  if (language === "en") {
    if (actorCount === 1) {
      return {
        title: "New comment",
        message: `${firstActor} commented on your post "${postTitle}".`,
      };
    }

    if (actorCount === 2) {
      return {
        title: "New comments",
        message: `${firstActor} and ${secondActor} commented on your post "${postTitle}".`,
      };
    }

    return {
      title: "New comments",
      message: `${actorNames.slice(0, 2).join(", ")} and ${others} others commented on your post "${postTitle}".`,
    };
  }

  if (actorCount === 1) {
    return {
      title: "Bình luận mới",
      message: `${firstActor} đã bình luận bài viết "${postTitle}" của bạn.`,
    };
  }

  if (actorCount === 2) {
    return {
      title: "Bình luận mới",
      message: `${firstActor} và ${secondActor} đã bình luận bài viết "${postTitle}" của bạn.`,
    };
  }

  return {
    title: "Bình luận mới",
    message: `${actorNames.slice(0, 2).join(", ")} và ${others} người khác đã bình luận bài viết "${postTitle}" của bạn.`,
  };
};

export const notificationTemplateRenderers: Record<
  string,
  NotificationTemplateRenderer
> = {
  job_applied: buildSimpleRenderer({
    title: {
      vi: "Đơn ứng tuyển mới",
      en: "New application",
    },
    message: {
      vi: 'Có một đơn ứng tuyển mới cho vị trí "{{jobTitle}}"',
      en: 'There is a new application for the position "{{jobTitle}}"',
    },
  }),
  cv_approved: buildSimpleRenderer({
    title: {
      vi: "Đơn ứng tuyển được chấp nhận",
      en: "Application accepted",
    },
    message: {
      vi: 'Đơn ứng tuyển của bạn cho vị trí "{{jobTitle}}" đã được chấp nhận.',
      en: 'Your application for "{{jobTitle}}" has been accepted.',
    },
  }),
  cv_rejected: buildSimpleRenderer({
    title: {
      vi: "Đơn ứng tuyển bị từ chối",
      en: "Application rejected",
    },
    message: {
      vi: 'Đơn ứng tuyển của bạn cho vị trí "{{jobTitle}}" đã bị từ chối.',
      en: 'Your application for "{{jobTitle}}" has been rejected.',
    },
  }),
  job_posted: buildSimpleRenderer({
    title: {
      vi: "Công việc mới được tạo",
      en: "New job created",
    },
    message: {
      vi: 'Công việc "{{jobTitle}}" đã được tạo và đang chờ phê duyệt.',
      en: 'Job "{{jobTitle}}" was created and is waiting for approval.',
    },
  }),
  job_updated: buildSimpleRenderer({
    title: {
      vi: "Công việc được cập nhật",
      en: "Job updated",
    },
    message: {
      vi: 'Công việc "{{jobTitle}}" đã được cập nhật và cần phê duyệt lại.',
      en: 'Job "{{jobTitle}}" was updated and needs approval again.',
    },
  }),
  job_approved: buildSimpleRenderer({
    title: {
      vi: "Công việc đã được phê duyệt",
      en: "Job approved",
    },
    message: {
      vi: 'Công việc "{{jobTitle}}" đã được phê duyệt.',
      en: 'Job "{{jobTitle}}" has been approved.',
    },
  }),
  job_matched: buildSimpleRenderer({
    title: {
      vi: "Công việc phù hợp mới",
      en: "New matching job",
    },
    message: {
      vi: 'Công việc "{{jobTitle}}" có thể phù hợp với bạn.',
      en: 'Job "{{jobTitle}}" may be a good match for you.',
    },
  }),
  profile_viewed: buildSimpleRenderer({
    title: {
      vi: "Hồ sơ của bạn vừa được xem",
      en: "Your profile was viewed",
    },
    message: {
      vi: "{{viewerName}} vừa xem hồ sơ của bạn.",
      en: "{{viewerName}} viewed your profile.",
    },
  }),
  admin_job_approved: buildSimpleRenderer({
    title: {
      vi: "Cập nhật trạng thái công việc",
      en: "Job status updated",
    },
    message: {
      vi: 'Công việc "{{jobTitle}}" đã được phê duyệt bởi quản trị viên.',
      en: 'Job "{{jobTitle}}" was approved by an administrator.',
    },
  }),
  admin_job_rejected: buildSimpleRenderer({
    title: {
      vi: "Cập nhật trạng thái công việc",
      en: "Job status updated",
    },
    message: {
      vi: 'Công việc "{{jobTitle}}" đã bị từ chối bởi quản trị viên.',
      en: 'Job "{{jobTitle}}" was rejected by an administrator.',
    },
  }),
  feedback_assigned: buildSimpleRenderer({
    title: {
      vi: "Bạn được giao xử lý feedback",
      en: "You were assigned a feedback ticket",
    },
    message: {
      vi: "Phản hồi: {{feedbackSubject}}",
      en: "Feedback: {{feedbackSubject}}",
    },
  }),
  organization_invitation: buildSimpleRenderer({
    title: {
      vi: "Lời mời vào tổ chức",
      en: "Organization invitation",
    },
    message: {
      vi: 'Bạn được mời tham gia tổ chức "{{organizationName}}".',
      en: 'You have been invited to join "{{organizationName}}".',
    },
  }),
  blog_comment_reply: buildSimpleRenderer({
    title: {
      vi: "Phản hồi bình luận",
      en: "Comment reply",
    },
    message: {
      vi: '{{commenterName}} đã trả lời bình luận của bạn trong bài viết "{{postTitle}}".',
      en: '{{commenterName}} replied to your comment in "{{postTitle}}".',
    },
  }),
  blog_comment: buildSimpleRenderer({
    title: {
      vi: "Bình luận mới",
      en: "New comment",
    },
    message: {
      vi: '{{commenterName}} đã bình luận bài viết "{{postTitle}}" của bạn.',
      en: '{{commenterName}} commented on your post "{{postTitle}}".',
    },
  }),
  blog_comment_aggregated: buildBlogCommentAggregatedRenderer,
  system: buildSimpleRenderer({
    title: {
      vi: "{{titleText}}",
      en: "{{titleText}}",
    },
    message: {
      vi: "{{messageText}}",
      en: "{{messageText}}",
    },
  }),
  system_learning_path_pending: buildSimpleRenderer({
    title: {
      vi: "Lộ trình học tập cho vai trò {{targetRole}}",
      en: "Learning path for role {{targetRole}}",
    },
    message: {
      vi: "Đang tạo lộ trình học tập cho {{targetRole}}. Vui lòng chờ trong giây lát!",
      en: "We are creating a learning path for {{targetRole}}. Please wait a moment!",
    },
  }),
  system_learning_path_in_progress: buildSimpleRenderer({
    title: {
      vi: "Lộ trình học tập cho vai trò {{targetRole}}",
      en: "Learning path for role {{targetRole}}",
    },
    message: {
      vi: "Đang tạo lộ trình học tập cho {{targetRole}}...",
      en: "Generating learning path for {{targetRole}}...",
    },
  }),
  system_learning_path_completed: buildSimpleRenderer({
    title: {
      vi: "Lộ trình học tập cho vai trò {{targetRole}}",
      en: "Learning path for role {{targetRole}}",
    },
    message: {
      vi: "Lộ trình học tập cho {{targetRole}} đã sẵn sàng.",
      en: "Your learning path for {{targetRole}} is ready.",
    },
  }),
  system_learning_path_failed: buildSimpleRenderer({
    title: {
      vi: "Lộ trình học tập cho vai trò {{targetRole}}",
      en: "Learning path for role {{targetRole}}",
    },
    message: {
      vi: "{{errorMessage}}",
      en: "{{errorMessage}}",
    },
  }),
  system_cv_generation_pending: buildSimpleRenderer({
    title: {
      vi: "CV của bạn đang được tối ưu",
      en: "Your CV is being optimized",
    },
    message: {
      vi: "Đang tối ưu CV dựa trên yêu cầu của bạn. Vui lòng chờ trong giây lát!",
      en: "We are optimizing your CV based on your request. Please wait a moment!",
    },
  }),
  system_cv_generation_in_progress: buildSimpleRenderer({
    title: {
      vi: "CV của bạn đang được tối ưu",
      en: "Your CV is being optimized",
    },
    message: {
      vi: "Đang tối ưu CV của bạn...",
      en: "Your CV is being optimized...",
    },
  }),
  system_cv_generation_completed: buildSimpleRenderer({
    title: {
      vi: "CV của bạn đã được tối ưu",
      en: "Your CV is ready",
    },
    message: {
      vi: "CV của bạn đã được tối ưu.",
      en: "Your CV has been optimized.",
    },
  }),
  system_cv_generation_failed: buildSimpleRenderer({
    title: {
      vi: "Không thể tối ưu CV",
      en: "CV optimization failed",
    },
    message: {
      vi: "{{errorMessage}}",
      en: "{{errorMessage}}",
    },
  }),
};
