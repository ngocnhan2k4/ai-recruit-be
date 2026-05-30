export interface CommentDto {
  content: string;
  parentCommentId?: string | null;
  authorId: string;
}
