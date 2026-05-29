export interface Comment {
  id: string;
  content: string;
  authorId: string;
  parentCommentId: string | null;
  rootCommentId: string | null;
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
  replyToComment?: {
    id: string;
    content: string;
    authorId: string;
    authorName?: string | null;
  } | null;
  childCount: number;
}

export interface NewComment {
  content: string;
  authorId: string;
  parentCommentId?: string | null;
  rootCommentId?: string | null;
  objectId: string;
  objectType: string;
  createdAt: Date;
}
