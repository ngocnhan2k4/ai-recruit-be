import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { TokenPayload } from "@/common/types";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants";
import { IBlogRepository } from "@/core/abstracts/repositories/blog-repository.abstract";
import { ApiResponse } from "@/interfaces/dtos";
import {
  CreateBlogCommentDto,
  CreateBlogPostDto,
  QueryBlogTagsDto,
  QueryBlogsDto,
  SaveDraftBlogPostDto,
  UpdateBlogPostDto,
} from "@/interfaces/dtos/blog/req/blog-post.dto";

@Injectable()
export class BlogUseCases {
  constructor(private readonly blogRepository: IBlogRepository) {}

  private generateSlug(value: string): string {
    const baseSlug = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

    const uniqueTail = Math.random().toString(36).substring(2, 8);
    return `${baseSlug}-${uniqueTail}`;
  }

  async getBlogs(query: QueryBlogsDto): Promise<ApiResponse<any>> {
    const limit = Math.min(query.limit ?? 10, 50);
    const page = Math.max(query.page ?? 1, 1);
    const result = await this.blogRepository.getPosts({
      ...query,
      limit,
      page,
      keyword: query.keyword,
      category: query.category,
    });

    const total = result.pagination.total ?? 0;
    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: {
        items: result.data,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    };
  }

  async getMyBlogs(
    user: TokenPayload,
    query: QueryBlogsDto,
  ): Promise<ApiResponse<any>> {
    const limit = Math.min(query.limit ?? 10, 50);
    const page = Math.max(query.page ?? 1, 1);
    const result = await this.blogRepository.getMyBlogs(user.userId, {
      ...query,
      limit,
      page,
      keyword: query.keyword,
      category: query.category,
    });

    const total = result.pagination.total ?? 0;
    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: {
        items: result.data,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    };
  }

  async getTopBlogs(): Promise<ApiResponse<any>> {
    await Promise.resolve();
    const result = [];

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: result,
    };
  }

  async getCategories(): Promise<ApiResponse<any>> {
    const categories = await this.blogRepository.getCategories();

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: categories,
    };
  }

  async getTags(query: QueryBlogTagsDto): Promise<ApiResponse<any>> {
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);
    const result = await this.blogRepository.getMergedTags({
      limit,
      cursor: query.cursor,
      keyword: query.keyword,
    });

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: {
        items: result.data,
        pagination: {
          nextCursor: result.pagination.nextCursor ?? null,
          hasNextPage: !!result.pagination.hasNextPage,
        },
      },
    };
  }

  async getBlogBySlug(
    slug: string,
    userId?: string,
  ): Promise<ApiResponse<any>> {
    const post = await this.blogRepository.getPostDetailBySlug(slug, userId);

    if (!post) {
      throw new NotFoundException({
        code: RESPONSE_CODE.JOB_NOT_FOUND,
        message: "Blog post not found",
      });
    }

    await this.blogRepository.incrementViewCount(post.id);

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: {
        ...post,
        viewCount: post.viewCount + 1,
      },
    };
  }

  async createPost(
    user: TokenPayload,
    dto: CreateBlogPostDto,
  ): Promise<
    ApiResponse<{
      slug: string;
    }>
  > {
    if (dto.postId) {
      const existing = await this.blogRepository.get(dto.postId);

      if (!existing) {
        throw new NotFoundException({
          code: RESPONSE_CODE.JOB_NOT_FOUND,
          message: "Blog post not found",
        });
      }

      if (existing.authorId !== user.userId) {
        throw new ForbiddenException({
          code: RESPONSE_CODE.FORBIDDEN,
          message: RESPONSE_MESSAGE.FORBIDDEN,
        });
      }

      if (existing.status !== "DRAFT") {
        throw new BadRequestException({
          code: RESPONSE_CODE.BAD_REQUEST,
          message: "Only draft blog posts can be submitted via create API",
        });
      }

      // Keep existing slug if present, otherwise generate new one
      const slug = existing.slug || this.generateSlug(dto.title);

      await this.blogRepository.saveDraft(
        {
          title: dto.title,
          summary: dto.summary,
          content: dto.content,
          category: dto.category,
          thumbnail: dto.thumbnail ?? null,
          tags: dto.tags,
          slug,
        },
        user.userId,
        dto.postId,
      );

      const [published] = await this.blogRepository.update(
        {
          id: dto.postId,
        },
        {
          status: "PENDING",
          updatedAt: new Date(),
        },
      );

      if (!published) {
        throw new NotFoundException({
          code: RESPONSE_CODE.JOB_NOT_FOUND,
          message: "Blog post not found",
        });
      }

      return {
        code: RESPONSE_CODE.CREATED,
        message: RESPONSE_MESSAGE.CREATED,
        data: { slug: published.slug },
      };
    }

    const baseSlug = this.generateSlug(dto.title);
    const existed = await this.blogRepository.getPostBySlug(baseSlug);
    const slug = existed ? `${baseSlug}-${Date.now()}` : baseSlug;

    const result = await this.blogRepository.createPost({
      title: dto.title,
      slug,
      summary: dto.summary,
      thumbnail: dto.thumbnail ?? null,
      content: dto.content,
      categoryId: dto.category,
      authorId: user.userId,
      status: "PENDING",
      tags: dto.tags,
    });

    return {
      code: RESPONSE_CODE.CREATED,
      message: RESPONSE_MESSAGE.CREATED,
      data: { slug: result.slug },
    };
  }

  async saveDraft(
    user: TokenPayload,
    dto: SaveDraftBlogPostDto,
    postId?: string,
  ): Promise<ApiResponse<{ id: string; slug: string }>> {
    const result = await this.blogRepository.saveDraft(
      {
        title: dto.title,
        summary: dto.summary,
        content: dto.content,
        category: dto.category,
        thumbnail: dto.thumbnail ?? null,
        tags: dto.tags,
      },
      user.userId,
      postId,
    );

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: "Draft saved successfully",
      data: { id: result.id, slug: result.slug },
    };
  }

  async updatePost(
    user: TokenPayload,
    postId: string,
    dto: UpdateBlogPostDto,
  ): Promise<ApiResponse<UpdateBlogPostDto>> {
    const existing = await this.blogRepository.get(postId);

    if (!existing) {
      throw new NotFoundException({
        code: RESPONSE_CODE.JOB_NOT_FOUND,
        message: "Blog post not found",
      });
    }

    if (existing.authorId !== user.userId) {
      throw new ForbiddenException({
        code: RESPONSE_CODE.FORBIDDEN,
        message: RESPONSE_MESSAGE.FORBIDDEN,
      });
    }

    const updated = await this.blogRepository.update(
      {
        id: postId,
      },
      {
        title: dto.title,
        summary: dto.summary,
        thumbnail: dto.thumbnail,
        content: dto.content,
        categoryId: dto.category,
        updatedAt: new Date(),
      },
    );

    if (!updated) {
      throw new NotFoundException({
        code: RESPONSE_CODE.JOB_NOT_FOUND,
        message: "Blog post not found",
      });
    }

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: updated[0],
    };
  }

  async deletePost(
    user: TokenPayload,
    postId: string,
  ): Promise<ApiResponse<void>> {
    const existing = await this.blogRepository.get(postId);

    if (!existing) {
      throw new NotFoundException({
        code: RESPONSE_CODE.JOB_NOT_FOUND,
        message: "Blog post not found",
      });
    }

    if (existing.authorId !== user.userId) {
      throw new ForbiddenException({
        code: RESPONSE_CODE.FORBIDDEN,
        message: RESPONSE_MESSAGE.FORBIDDEN,
      });
    }

    await this.blogRepository.delete({
      id: postId,
      authorId: user.userId,
    });

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
    };
  }

  async createComment(
    user: TokenPayload,
    postId: string,
    dto: CreateBlogCommentDto,
  ): Promise<ApiResponse<CreateBlogCommentDto>> {
    const comment = await this.blogRepository.createComment({
      postId: postId,
      authorId: user.userId,
      content: dto.content,
      parentCommentId: dto.parentCommentId,
    });

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: comment,
    };
  }

  async deleteComment(
    user: TokenPayload,
    postId: string,
    commentId: string,
  ): Promise<ApiResponse<void>> {
    const comment = await this.blogRepository.getCommentById(commentId);

    if (!comment || comment.postId !== postId) {
      throw new NotFoundException({
        code: RESPONSE_CODE.JOB_NOT_FOUND,
        message: "Comment not found",
      });
    }

    if (comment.authorId !== user.userId) {
      throw new ForbiddenException({
        code: RESPONSE_CODE.FORBIDDEN,
        message: RESPONSE_MESSAGE.FORBIDDEN,
      });
    }

    await this.blogRepository.deleteCommentById(commentId, user.userId);

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
    };
  }

  async toggleLike(
    user: TokenPayload,
    postId: string,
  ): Promise<ApiResponse<void>> {
    const post = await this.blogRepository.get(postId);

    if (!post) {
      throw new NotFoundException({
        code: RESPONSE_CODE.JOB_NOT_FOUND,
        message: "Blog post not found",
      });
    }

    await this.blogRepository.toggleLike(post.id, user.userId);
    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
    };
  }

  async approvePost(postId: string): Promise<ApiResponse<{ id: string }>> {
    return this.reviewPost(postId, "PUBLISHED");
  }

  async rejectPost(postId: string): Promise<ApiResponse<{ id: string }>> {
    return this.reviewPost(postId, "REJECTED");
  }

  private async reviewPost(
    postId: string,
    status: "PUBLISHED" | "REJECTED",
  ): Promise<ApiResponse<{ id: string }>> {
    const post = await this.blogRepository.get(postId);

    if (!post) {
      throw new NotFoundException({
        code: RESPONSE_CODE.JOB_NOT_FOUND,
        message: "Blog post not found",
      });
    }

    await this.blogRepository.update(
      { id: postId },
      {
        status,
        updatedAt: new Date(),
      },
    );

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: { id: postId },
    };
  }
}
