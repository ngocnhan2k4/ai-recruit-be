import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PaginatedResult, TokenPayload } from "@/common/types";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants";
import { IBlogRepository } from "@/core/abstracts/repositories/blog-repository.abstract";
import { IUserActionRepository } from "@/core/abstracts/repositories/user-action-repository.abstract";
import { ICommentRepository } from "@/core/abstracts/repositories/comment-repository.abstract";
import { ApiResponse } from "@/interfaces/dtos";
import {
  CreateBlogPostDto,
  CreateBlogCommentDto,
  QueryBlogsDto,
  QueryBlogTagsDto,
  SaveDraftBlogPostDto,
  UpdateBlogPostDto,
} from "@/interfaces/dtos/blog/req";
import { BlogService } from "@/services/blog/blog.service";
import { BlogPostListItemDto } from "@/interfaces/dtos/blog/res/blog-post.dto";
import {
  BlogPostListItem,
  BlogPostUserActions,
} from "@/core/entities/blog.entity";
import {
  BlogPostStatus,
  Comment,
  ObjectType,
  UserActionType,
} from "@/core/entities";
import { generateSlug } from "@/common/utils/string";

@Injectable()
export class BlogUseCases {
  constructor(
    private readonly blogRepository: IBlogRepository,
    private readonly userActionRepository: IUserActionRepository,
    private readonly commentRepository: ICommentRepository,
    private readonly blogService: BlogService,
  ) {}

  async createComment(
    user: TokenPayload,
    postId: string,
    dto: CreateBlogCommentDto,
  ): Promise<ApiResponse<Comment>> {
    const post = await this.blogRepository.get(postId);

    if (!post) {
      throw new NotFoundException({
        code: RESPONSE_CODE.JOB_NOT_FOUND,
        message: "Blog post not found",
      });
    }

    const _cmt = await this.commentRepository.create({
      content: dto.content,
      parentCommentId: dto.parentCommentId,
      objectId: post.id,
      objectType: ObjectType.BLOG,
      authorId: user.userId,
    });

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: _cmt,
    };
  }

  async getBlogs(
    query: QueryBlogsDto,
  ): Promise<ApiResponse<PaginatedResult<BlogPostListItemDto>>> {
    const limit = Math.min(query.limit ?? 10, 50);
    const page = Math.max(query.page ?? 1, 1);
    const { data, pagination } = await this.blogRepository.getPosts({
      ...query,
      limit,
      page,
      keyword: query.keyword,
      category: query.category,
      status: BlogPostStatus.PUBLISHED,
    });

    const dataWithTags = await this.getBlogsWithTags(data);

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: {
        data: dataWithTags,
        pagination,
      },
    };
  }

  async getMyBlogs(
    userId: string,
    query: QueryBlogsDto,
  ): Promise<ApiResponse<PaginatedResult<BlogPostListItemDto>>> {
    const limit = Math.min(query.limit ?? 10, 50);
    const page = Math.max(query.page ?? 1, 1);
    const { data, pagination } = await this.blogRepository.getMyBlogs(userId, {
      ...query,
      limit,
      page,
      keyword: query.keyword,
      category: query.category,
    });

    const dataWithTags = await this.getBlogsWithTags(data);

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: {
        data: dataWithTags,
        pagination,
      },
    };
  }

  private async getBlogsWithTags(
    data: BlogPostListItem[],
  ): Promise<BlogPostListItemDto[]> {
    const postIds = data.map((blog) => blog.id);
    const [tagsMap, likesMap] = await Promise.all([
      this.blogRepository.getPostsTags(postIds),
      this.userActionRepository.getActionCountsByObjectIds(
        postIds,
        ObjectType.BLOG,
        UserActionType.LIKE,
      ),
    ]);

    return data.map((blog) => ({
      ...blog,
      likes: likesMap[blog.id] ?? 0,
      tags: tagsMap[blog.id] || [],
    }));
  }

  async getTopBlogs(): Promise<
    ApiResponse<PaginatedResult<BlogPostListItemDto>>
  > {
    await Promise.resolve();
    const result = [] as any;

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
    const post = await this.blogRepository.getPostBaseBySlug(slug);

    if (!post) {
      throw new NotFoundException({
        code: RESPONSE_CODE.JOB_NOT_FOUND,
        message: "Blog post not found",
      });
    }

    const actionsPromise: Promise<BlogPostUserActions> = userId
      ? this.userActionRepository.getUserActionState(
          post.id,
          ObjectType.BLOG,
          userId,
        )
      : Promise.resolve({ isLiked: false, isSaved: false });

    const [actions, tags, likes] = await Promise.all([
      actionsPromise,
      this.blogRepository.getPostTagsByPostId(post.id),
      this.userActionRepository.getActionCount(
        post.id,
        ObjectType.BLOG,
        UserActionType.LIKE,
      ),
    ]);

    await this.blogRepository.incrementViewCount(post.id);

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: {
        ...post,
        likes,
        isSaved: actions.isSaved,
        isLiked: actions.isLiked,
        tags,
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

      const published = await this.blogRepository.executeWithTransaction(
        async (tx) => {
          if (existing.authorId !== user.userId) {
            throw new ForbiddenException({
              code: RESPONSE_CODE.FORBIDDEN,
              message: RESPONSE_MESSAGE.FORBIDDEN,
            });
          }

          if (existing.status !== (BlogPostStatus.DRAFT as string)) {
            throw new BadRequestException({
              code: RESPONSE_CODE.BAD_REQUEST,
              message: "Only draft blog posts can be submitted via create API",
            });
          }

          const slug = existing.slug || generateSlug(dto.title);

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
            tx,
          );

          const [updated] = await this.blogRepository.update(
            {
              id: dto.postId,
            },
            {
              status: BlogPostStatus.PENDING,
              updatedAt: new Date(),
            },
            tx,
          );

          if (!updated) {
            throw new NotFoundException({
              code: RESPONSE_CODE.JOB_NOT_FOUND,
              message: "Blog post not found",
            });
          }

          return updated;
        },
      );

      return {
        code: RESPONSE_CODE.CREATED,
        message: RESPONSE_MESSAGE.CREATED,
        data: { slug: published.slug },
      };
    }

    const result = await this.blogRepository.executeWithTransaction(
      async () => {
        const baseSlug = generateSlug(dto.title);
        const existed = await this.blogRepository.getPostBySlug(baseSlug);
        const slug = existed ? `${baseSlug}-${Date.now()}` : baseSlug;

        return this.blogRepository.createPost({
          title: dto.title,
          slug,
          summary: dto.summary,
          thumbnail: dto.thumbnail ?? null,
          content: dto.content,
          categoryId: dto.category,
          authorId: user.userId,
          status: BlogPostStatus.PENDING,
          tags: dto.tags ?? [],
        });
      },
    );

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
    const result = await this.blogRepository.executeWithTransaction(
      async (tx) => {
        return this.blogRepository.saveDraft(
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
          tx,
        );
      },
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
    const updated = await this.blogRepository.executeWithTransaction(
      async (tx) => {
        await this.blogService.checkIsAuthor(postId, user.userId);

        const rows = await this.blogRepository.update(
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
          tx,
        );

        if (!rows || rows.length === 0) {
          throw new NotFoundException({
            code: RESPONSE_CODE.JOB_NOT_FOUND,
            message: "Blog post not found",
          });
        }

        return rows[0];
      },
    );

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: updated as UpdateBlogPostDto,
    };
  }

  async deletePost(
    user: TokenPayload,
    postId: string,
  ): Promise<ApiResponse<void>> {
    await this.blogService.checkIsAuthor(postId, user.userId);

    await this.blogRepository.delete({
      id: postId,
      authorId: user.userId,
    });

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
    };
  }

  async toggleLike(
    user: TokenPayload,
    postId: string,
  ): Promise<ApiResponse<void>> {
    await this.blogService.checkValidPost(postId);

    await this.userActionRepository.toggleAction(
      postId,
      ObjectType.BLOG,
      user.userId,
      UserActionType.LIKE,
    );
    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
    };
  }

  async toggleSave(
    user: TokenPayload,
    postId: string,
  ): Promise<ApiResponse<void>> {
    await this.blogService.checkValidPost(postId);

    await this.userActionRepository.toggleAction(
      postId,
      ObjectType.BLOG,
      user.userId,
      UserActionType.SAVE,
    );
    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
    };
  }

  async approvePost(postId: string): Promise<ApiResponse<{ id: string }>> {
    return this.reviewPost(postId, BlogPostStatus.PUBLISHED);
  }

  async rejectPost(postId: string): Promise<ApiResponse<{ id: string }>> {
    return this.reviewPost(postId, BlogPostStatus.REJECTED);
  }

  private async reviewPost(
    postId: string,
    status: BlogPostStatus.PUBLISHED | BlogPostStatus.REJECTED,
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
