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
  createdAt: Date;
  likes: number;
  status: string;
  tags: Array<{
    name: string;
    skillId: string | null;
    tagId: string | null;
  }>;
}

export interface BlogPostAuthor {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
}

export interface BlogCommentItem {
  id: string;
  content: string;
  createdAt: Date;
  author: BlogPostAuthor;
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
  createdAt: Date;
  author: BlogPostAuthor;
  comments: BlogCommentItem[];
  likes: number;
  isSaved: boolean;
  isLiked: boolean;
  status: string;
  tags: Array<{
    name: string;
    skillId: string | null;
    tagId: string | null;
  }>;
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
