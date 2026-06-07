export interface CommentDto {
  content: string;
  parentId?: string | null;
  authorId: string;
}
