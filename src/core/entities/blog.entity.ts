import { GeneralQuery } from "@/common/types";

export interface BlogPostFilters extends GeneralQuery {
  category?: string;
  keyword?: string;
}

export interface BlogPostListItem {
  id: string;
  title: string;
  slug: string;
  summary: string;
  thumbnail: string | null;
  category: string;
  likes: number;
  status: string;
  tags: Array<{
    name: string;
    skillId: string | null;
    tagId: string | null;
  }>;
  createdAt: Date;
}

export interface BlogPostAuthor {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
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
  status: string;
  tags: Array<{
    name: string;
    skillId: string | null;
    tagId: string | null;
  }>;
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
