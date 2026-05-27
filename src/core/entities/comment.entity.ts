import { BlogPostAuthor } from "./blog.entity";

export interface Comment {
  id: string;
  content: string;
  languageCode: string;
  authorId: string;
  parentCommentId: string | null;
  objectId: string;
  objectType: string;
  createdAt: Date;
}

export interface CommentWithAuthor extends Comment {
  author: BlogPostAuthor;
  childCount: number;
  canTranslate?: boolean;
}

export interface NewComment {
  content: string;
  languageCode?: string;
  authorId: string;
  parentCommentId?: string | null;
  objectId: string;
  objectType: string;
  createdAt: Date;
}
