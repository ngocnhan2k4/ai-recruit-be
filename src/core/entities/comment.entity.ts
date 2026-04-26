export interface Comment {
  id: string;
  content: string;
  authorId: string;
  parentCommentId: string | null;
  organizationId: string | null;
  blogPostId: string | null;
  type: string;
  createdAt: Date;
}
