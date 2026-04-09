import { PaginatedResult } from "@/common/types";
import {
  BlogCommentItem,
  BlogLikeResult,
  BlogPostDetail,
  BlogPostFilters,
  BlogPostListItem,
  BlogPostTagInput,
} from "@/core/entities/blog.entity";
import { BlogComment, BlogPost, NewBlogPost } from "@/core/entities";
import { IGenericRepository } from "./generic-repository.abstract";

export abstract class IBlogRepository extends IGenericRepository<BlogPost> {
  abstract getPosts(
    filters: BlogPostFilters,
  ): Promise<PaginatedResult<BlogPostListItem>>;

  abstract getPostDetailBySlug(slug: string): Promise<BlogPostDetail | null>;

  abstract getPostBySlug(slug: string): Promise<BlogPost | null>;

  abstract createPost(
    data: NewBlogPost,
    tags?: BlogPostTagInput[],
  ): Promise<BlogPost>;

  abstract updatePostBySlug(
    slug: string,
    authorId: string,
    data: Partial<BlogPost>,
  ): Promise<BlogPost | null>;

  abstract deletePostBySlug(slug: string, authorId: string): Promise<boolean>;

  abstract createComment(data: {
    postId: string;
    authorId: string;
    content: string;
  }): Promise<BlogCommentItem>;

  abstract getCommentById(commentId: string): Promise<BlogComment | null>;

  abstract deleteCommentById(
    commentId: string,
    authorId: string,
  ): Promise<boolean>;

  abstract toggleLike(postId: string, userId: string): Promise<BlogLikeResult>;

  abstract incrementViewCount(postId: string): Promise<void>;
}
