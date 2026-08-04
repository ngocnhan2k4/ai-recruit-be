import { ObjectType } from "@/core/entities/enum.entity";

export const ObjectNameMap: Record<ObjectType, string> = {
  [ObjectType.JOB]: "tin tuyển dụng",
  [ObjectType.ORG]: "tổ chức",
  [ObjectType.USER]: "hồ sơ",
  [ObjectType.BLOG]: "bài viết",
};
