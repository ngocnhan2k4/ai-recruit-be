export interface Comment {
  id: string;
  content: string;
  languageCode: string;
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
  canTranslate?: boolean;
}

export interface NewComment {
  content: string;
  languageCode?: string;
  authorId: string;
  parentCommentId?: string | null;
  depth: number;
  objectId: string;
  objectType: string;
  createdAt: Date;
}
