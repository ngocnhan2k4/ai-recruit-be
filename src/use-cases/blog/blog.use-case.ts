import {
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
  QueryBlogsDto,
  UpdateBlogPostDto,
} from "@/interfaces/dtos/blog/req/blog-post.req.dto";

@Injectable()
export class BlogUseCases {
  constructor(private readonly blogRepository: IBlogRepository) {}

  private generateSlug(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
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

    const total = Number(result.pagination.total ?? 0);
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

  async getBlogBySlug(slug: string): Promise<ApiResponse<any>> {
    const post = await this.blogRepository.getPostDetailBySlug(slug);

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
  ): Promise<ApiResponse<any>> {
    const baseSlug = this.generateSlug(dto.title);
    const existed = await this.blogRepository.getPostBySlug(baseSlug);
    const slug = existed ? `${baseSlug}-${Date.now()}` : baseSlug;

    await this.blogRepository.createPost(
      {
        title: dto.title,
        slug,
        summary: dto.summary,
        thumbnail: dto.thumbnail ?? null,
        content: dto.content,
        categoryId: dto.category,
        authorId: user.userId,
      },
      dto.tags,
    );

    const detail = await this.blogRepository.getPostDetailBySlug(slug);
    return {
      code: RESPONSE_CODE.CREATED,
      message: RESPONSE_MESSAGE.CREATED,
      data: detail,
    };
  }

  async updatePost(
    user: TokenPayload,
    slug: string,
    dto: UpdateBlogPostDto,
  ): Promise<ApiResponse<any>> {
    const existing = await this.blogRepository.getPostBySlug(slug);

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

    const nextSlug = dto.title ? this.generateSlug(dto.title) : undefined;
    const updated = await this.blogRepository.updatePostBySlug(
      slug,
      user.userId,
      {
        title: dto.title,
        slug: nextSlug,
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

    const detail = await this.blogRepository.getPostDetailBySlug(updated.slug);
    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: detail,
    };
  }

  async deletePost(
    user: TokenPayload,
    slug: string,
  ): Promise<ApiResponse<null>> {
    const existing = await this.blogRepository.getPostBySlug(slug);

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

    await this.blogRepository.deletePostBySlug(slug, user.userId);

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: null,
    };
  }

  async createComment(
    user: TokenPayload,
    slug: string,
    dto: CreateBlogCommentDto,
  ): Promise<ApiResponse<any>> {
    const post = await this.blogRepository.getPostBySlug(slug);

    if (!post) {
      throw new NotFoundException({
        code: RESPONSE_CODE.JOB_NOT_FOUND,
        message: "Blog post not found",
      });
    }

    const comment = await this.blogRepository.createComment({
      postId: post.id,
      authorId: user.userId,
      content: dto.content,
    });

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: comment,
    };
  }

  async deleteComment(
    user: TokenPayload,
    slug: string,
    commentId: string,
  ): Promise<ApiResponse<null>> {
    const post = await this.blogRepository.getPostBySlug(slug);

    if (!post) {
      throw new NotFoundException({
        code: RESPONSE_CODE.JOB_NOT_FOUND,
        message: "Blog post not found",
      });
    }

    const comment = await this.blogRepository.getCommentById(commentId);

    if (!comment || comment.postId !== post.id) {
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
      data: null,
    };
  }

  async toggleLike(
    user: TokenPayload,
    slug: string,
  ): Promise<ApiResponse<any>> {
    const post = await this.blogRepository.getPostBySlug(slug);

    if (!post) {
      throw new NotFoundException({
        code: RESPONSE_CODE.JOB_NOT_FOUND,
        message: "Blog post not found",
      });
    }

    const result = await this.blogRepository.toggleLike(post.id, user.userId);
    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: result,
    };
  }
}
