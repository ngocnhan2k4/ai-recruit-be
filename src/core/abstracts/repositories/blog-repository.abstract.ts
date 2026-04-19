import { PaginatedResult } from "@/common/types";
import {
  BlogCategoryItem,
  BlogPostDetail,
  BlogPostFilters,
  BlogPostListItem,
  BlogTagCursorItem,
} from "@/core/entities/blog.entity";
import { BlogPost, NewBlogPost, NewComment } from "@/core/entities";
import { IGenericRepository } from "./generic-repository.abstract";

export abstract class IBlogRepository extends IGenericRepository<BlogPost> {
  abstract getCategories(): Promise<BlogCategoryItem[]>;

  abstract getMergedTags(filters: {
    limit: number;
    cursor?: string;
    keyword?: string;
  }): Promise<PaginatedResult<BlogTagCursorItem>>;

  abstract getPosts(
    filters: BlogPostFilters,
  ): Promise<PaginatedResult<BlogPostListItem>>;

  abstract getMyBlogs(
    authorId: string,
    filters: BlogPostFilters,
  ): Promise<PaginatedResult<BlogPostListItem>>;

  abstract getPostDetailBySlug(
    slug: string,
    userId?: string,
  ): Promise<BlogPostDetail | null>;

  abstract getPostBySlug(slug: string): Promise<BlogPost | null>;

  abstract createPost(data: NewBlogPost): Promise<BlogPost>;

  abstract saveDraft(
    data: {
      title?: string;
      summary?: string;
      content?: string;
      category?: string;
      thumbnail?: string | null;
      tags?: Array<{ tagId?: string | null; skillId?: string | null }>;
      slug?: string;
    },
    authorId: string,
    postId?: string,
  ): Promise<BlogPost>;

  abstract toggleLike(postId: string, userId: string): Promise<void>;

  abstract toggleSave(postId: string, userId: string): Promise<void>;

  abstract incrementViewCount(postId: string): Promise<void>;

  abstract comment(data: NewComment): Promise<void>;
}
