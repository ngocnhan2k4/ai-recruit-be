import { BlogPostAuthor } from "./blog.entity";

export interface Comment {
  id: string;
  content: string;
  authorId: string;
  parentCommentId: string | null;
  objectId: string;
  objectType: string;
  createdAt: Date;
}

export interface CommentWithAuthor extends Comment {
  author: BlogPostAuthor;
  childCount: number;
}

export interface NewComment {
  content: string;
  authorId: string;
  parentCommentId?: string | null;
  objectId: string;
  objectType: string;
  createdAt: Date;
}
