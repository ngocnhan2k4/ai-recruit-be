import { PaginatedResult } from "@/common/types";
import {
  BlogCategoryItem,
  BlogPostDetailBase,
  BlogPostFilters,
  BlogLocaleMap,
  BlogPostListItem,
  BlogPostTagItem,
  BlogTagCursorItem,
} from "@/core/entities/blog.entity";
import { BlogPost, NewBlogPost, BlogCategory, Tag } from "@/core/entities";
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

  abstract getSavedBlogs(
    userId: string,
    filters: BlogPostFilters,
  ): Promise<PaginatedResult<BlogPostListItem>>;

  abstract getPostsTags(
    postIds: string[],
  ): Promise<Record<string, BlogPostTagItem[]>>;

  abstract getPostBaseBySlug(slug: string): Promise<BlogPostDetailBase | null>;
  abstract getPostBaseById(id: string): Promise<BlogPostDetailBase | null>;

  abstract getPostTagsByPostId(postId: string): Promise<BlogPostTagItem[]>;

  abstract getPostBySlug(slug: string): Promise<BlogPost | null>;

  abstract createPost(data: NewBlogPost): Promise<BlogPost>;

  abstract saveDraft(
    data: {
      title?: string;
      summary?: string;
      content?: string;
      locales?: BlogLocaleMap;
      category?: string;
      thumbnail?: string | null;
      tags?: Array<{ tagId?: string | null; skillId?: string | null }>;
      slug?: string;
    },
    authorId: string,
    postId?: string,
  ): Promise<BlogPost>;

  abstract incrementViewCount(
    data: { postId: string; viewCount: number }[],
  ): Promise<void>;

  abstract updatePostTags(
    postId: string,
    tags: Array<{ tagId?: string | null; skillId?: string | null }>,
  ): Promise<void>;

  abstract getCategoriesPaginated(filters: {
    keyword?: string;
    page: number;
    limit: number;
  }): Promise<PaginatedResult<BlogCategory>>;

  abstract getTagsPaginated(filters: {
    keyword?: string;
    page: number;
    limit: number;
  }): Promise<PaginatedResult<Tag>>;

  abstract createCategory(data: {
    name: string;
    description?: string;
  }): Promise<BlogCategory>;

  abstract createTag(data: { name: string; slug: string }): Promise<Tag>;

  abstract getCategoryByName(name: string): Promise<BlogCategory | null>;

  abstract getTagByNameOrSlug(name: string, slug: string): Promise<Tag | null>;
}
