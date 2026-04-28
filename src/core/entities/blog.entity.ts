import { GeneralQuery } from "@/common/types";
import { BlogPostStatus } from "./enum.entity";

export interface BlogPostFilters extends GeneralQuery {
  category?: string;
  keyword?: string;
  status?: BlogPostStatus;
  excludeStatus?: BlogPostStatus;
}

export interface BlogPostListItem {
  id: string;
  title: string;
  slug: string;
  summary: string;
  thumbnail: string | null;
  category: string;
  status: BlogPostStatus;
  createdAt: Date;
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
  author: BlogPostAuthor;
  status: BlogPostStatus;
  createdAt: Date;
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
  author: BlogPostAuthor;
  likes: number;
  isSaved: boolean;
  isLiked: boolean;
  status: BlogPostStatus;
  tags: BlogPostTagItem[];
  createdAt: Date;
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
