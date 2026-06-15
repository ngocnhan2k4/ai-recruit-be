export interface Comment {
  id: string;
  content: string;
  authorId: string;
  parentCommentId: string | null;
  depth: number;
  objectId: string;
  objectType: string;
  createdAt: Date;
}

export interface CommentAuthor {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export interface CommentWithAuthor extends Comment {
  author: CommentAuthor;
  childCount: number;
}

export interface NewComment {
  content: string;
  authorId: string;
  parentCommentId?: string | null;
  depth: number;
  objectId: string;
  objectType: string;
  createdAt: Date;
}
