import { GeneralQuery } from "@/common/types";
import { BlogPostStatus, BlogSourceType } from "./enum.entity";
export { BlogSourceType };

export interface BlogPostFilters extends GeneralQuery {
  category?: string;
  status?: BlogPostStatus;
  excludeStatus?: BlogPostStatus;
  sourceType?: BlogSourceType;
}

export interface BlogPostSource {
  url?: string | null;
  author?: string | null;
  platform?: string | null;
}

export interface BlogPostListItem {
  id: string;
  title: string;
  slug: string;
  summary: string;
  thumbnail: string | null;
  category: string;
  status: BlogPostStatus;
  sourceType: BlogSourceType;
  source: BlogPostSource | null;
  createdAt: Date;
  updatedAt?: Date | null;
}

export interface BlogPostAuthor {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
}

export interface BlogPostTagItem {
  name: string;
  skillId: string | null;
  tagId: string | null;
}

export interface BlogPostUserActions {
  isSaved: boolean;
  isLiked: boolean;
}

export interface BlogPostDetailBase {
  id: string;
  title: string;
  slug: string;
  summary: string;
  thumbnail: string | null;
  content: string;
  category: string;
  viewCount: number;
  author: BlogPostAuthor | null;
  status: BlogPostStatus;
  sourceType: BlogSourceType;
  source: BlogPostSource | null;
  createdAt: Date;
  updatedAt?: Date | null;
}

export interface BlogPostDetail {
  id: string;
  title: string;
  slug: string;
  summary: string;
  thumbnail: string | null;
  content: string;
  category: string;
  viewCount: number;
  author: BlogPostAuthor | null;
  likes: number;
  isSaved: boolean;
  isLiked: boolean;
  status: BlogPostStatus;
  sourceType: BlogSourceType;
  source: BlogPostSource | null;
  tags: BlogPostTagItem[];
  createdAt: Date;
  updatedAt?: Date | null;
}

export interface BlogLikeResult {
  liked: boolean;
}

export interface BlogCategoryItem {
  id: string;
  name: string;
}

export interface BlogTagCursorItem {
  name: string;
  skillId: string | null;
  tagId: string | null;
}

export interface BlogPostTagInput {
  tagId?: string | null;
  skillId?: string | null;
}
