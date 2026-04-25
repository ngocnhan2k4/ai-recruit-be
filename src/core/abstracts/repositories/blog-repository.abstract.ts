import { PaginatedResult } from "@/common/types";
import {
  BlogCategoryItem,
  BlogPostDetailBase,
  BlogPostFilters,
  BlogPostListItem,
  BlogPostTagItem,
  BlogTagCursorItem,
} from "@/core/entities/blog.entity";
import { BlogPost, NewBlogPost } from "@/core/entities";
import { IGenericRepository } from "./generic-repository.abstract";
import { DBDrizzleTransaction } from "@/frameworks/data-services/postgres/types";

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

  abstract getPostsTags(
    postIds: string[],
  ): Promise<Record<string, BlogPostTagItem[]>>;

  abstract getPostBaseBySlug(slug: string): Promise<BlogPostDetailBase | null>;

  abstract getPostTagsByPostId(postId: string): Promise<BlogPostTagItem[]>;

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
    tx?: DBDrizzleTransaction,
  ): Promise<BlogPost>;

  abstract incrementViewCount(postId: string): Promise<void>;
}
