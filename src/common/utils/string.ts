import { JobStatusEnum } from "@/core";

export const generateUsername = (name: string, suffix?: number): string => {
  let username = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  username = username.replace(/\s+/g, ".");

  username = username.replace(/[^a-z0-9.]/g, "");

  if (suffix !== undefined) {
    username = `${username}${suffix}`;
  }

  return username + "-" + Date.now();
};

export const slugify = (text: string): string => {
  if (!text) {
    return "";
  }

  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-");
};

export const getJobStatus = (status: JobStatusEnum) => {
  switch (status) {
    case JobStatusEnum.ACTIVE:
      return "được duyệt";
    case JobStatusEnum.PAUSED:
      return "tạm dừng";
    case JobStatusEnum.CLOSED:
      return "đóng";
    case JobStatusEnum.REJECTED:
      return "bị từ chối";
    default:
      return "chuyển sang chờ xác nhận";
  }
};
