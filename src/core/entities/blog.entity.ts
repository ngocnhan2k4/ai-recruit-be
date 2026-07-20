import { GeneralQuery } from "@/common/types";
import { BlogPostStatus, BlogSourceType } from "./enum.entity";
export { BlogSourceType };

export interface BlogPostFilters extends GeneralQuery {
  category?: string;
  status?: BlogPostStatus;
  excludeStatus?: BlogPostStatus;
  sourceType?: BlogSourceType;
  skillIds?: string[];
  excludePostId?: string;
}

export interface BlogPostSource {
  url?: string | null;
  author?: string | null;
  platform?: string | null;
}

export interface BlogLocalizedContent {
  title?: string;
  summary?: string;
  content?: string;
}

export interface BlogLocaleMap {
  [languageCode: string]: BlogLocalizedContent | undefined;
}

export interface BlogGeneratedLocaleContent {
  title: string;
  summary: string;
  content: string;
}

export type BlogGeneratedLocaleMap = Partial<
  Record<"vi" | "en", BlogGeneratedLocaleContent>
>;

export interface BlogPostListItem {
  id: string;
  title: string;
  slug: string;
  summary: string;
  locales?: BlogLocaleMap;
  thumbnail: string | null;
  categoryId: string;
  categoryName: string;
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
  locales?: BlogLocaleMap;
  thumbnail: string | null;
  content: string;
  categoryId: string;
  categoryName: string;
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
  locales?: BlogLocaleMap;
  thumbnail: string | null;
  content: string;
  categoryId: string;
  categoryName: string;
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

export interface GenerateJobBlogPostRequest {
  rangeDays: number;
}

export interface GenerateJobBlogPostResponse {
  title: string;
  summary: string;
  categoryId?: string;
  category?: string;
  tags?: string[];
  tagInputs?: Array<{
    tagId?: string | null;
    skillId?: string | null;
    name?: string | null;
  }>;
  thumbnail?: string | null;
  content: string;
  locales?: BlogGeneratedLocaleMap;
  generatedAt?: string;
}
