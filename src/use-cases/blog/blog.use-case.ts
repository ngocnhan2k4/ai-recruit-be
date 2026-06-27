import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants";
import { CACHE_KEYS } from "@/common/constants/cache";
import { PaginatedResult, TokenPayload } from "@/common/types";
import { generateSlug } from "@/common/utils/string";
import { ICacheService } from "@/core";
import { INotificationService } from "@/core/abstracts/notification.abstract";
import { IBlogRepository } from "@/core/abstracts/repositories/blog-repository.abstract";
import { ICommentRepository } from "@/core/abstracts/repositories/comment-repository.abstract";
import { IUserActionRepository } from "@/core/abstracts/repositories/user-action-repository.abstract";
import { IUserRepository } from "@/core/abstracts/repositories/user-repository.abstract";
import {
  BlogCategory,
  BlogPost,
  BlogPostStatus,
  BlogSourceType,
  Comment,
  NotificationType,
  ObjectType,
  Tag,
  UserActionType,
} from "@/core/entities";
import {
  BlogPostListItem,
  BlogPostUserActions,
} from "@/core/entities/blog.entity";
import { ApiResponse } from "@/interfaces/dtos";
import {
  CreateBlogCategoryDto,
  CreateBlogPostDto,
  CreateBlogTagDto,
  QueryBlogCategoriesDto,
  QueryBlogsDto,
  QueryBlogTagsDto,
  SaveDraftBlogPostDto,
  UpdateBlogPostDto,
  UpdateBlogStatusRequest,
} from "@/interfaces/dtos/blog/req";
import {
  BlogCategoryDto,
  BlogPostDetailDto,
  BlogPostListItemDto,
  BlogTagCursorResponseDto,
} from "@/interfaces/dtos/blog/res/blog-post.dto";
import { CommentDto } from "@/interfaces/dtos/comment/req/comment.dto";
import { BlogService } from "@/services/blog/blog.service";
import { CommentService } from "@/services/comment/comment.service";
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";

@Injectable()
export class BlogUseCases {
  private readonly logger = new Logger(BlogUseCases.name);

  constructor(
    private readonly blogRepository: IBlogRepository,
    private readonly userActionRepository: IUserActionRepository,
    private readonly commentRepository: ICommentRepository,
    private readonly blogService: BlogService,
    private readonly cacheService: ICacheService,
    private readonly userRepository: IUserRepository,
    private readonly notificationService: INotificationService,
    private readonly commentService: CommentService,
  ) {}

  async createComment(
    user: TokenPayload,
    postId: string,
    dto: CommentDto,
  ): Promise<ApiResponse<Comment>> {
    const post = await this.blogService.checkPublished(postId);

    const { parentCommentId, depth } =
      await this.commentService.resolveCommentParent(
        dto.parentCommentId || null,
        postId,
      );

    const _cmt = await this.commentRepository.create({
      content: dto.content,
      parentCommentId,
      depth,
      objectId: post.id,
      objectType: ObjectType.BLOG,
      authorId: user.userId,
    });

    await this.sendCommentNotifications(post, _cmt, user);

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: _cmt,
    };
  }

  private async sendCommentNotifications(
    post: BlogPost,
    comment: Comment,
    user: TokenPayload,
  ): Promise<void> {
    try {
      const commenter = await this.userRepository.get(user.userId);
      const commenterName = commenter?.name || "Người dùng";

      if (comment.parentCommentId) {
        const parentComment = await this.commentRepository.get(
          comment.parentCommentId,
        );

        // Thông báo reply → không gộp, tạo riêng từng cái
        if (parentComment?.authorId && parentComment.authorId !== user.userId) {
          await this.notificationService.createAndSendToUser(
            {
              title: "Phản hồi bình luận",
              message: `${commenterName} đã trả lời bình luận của bạn trong bài viết ${post.title}.`,
              type: NotificationType.BLOG_COMMENT_REPLY,
              senderId: user.userId,
              payload: {
                blogId: post.id,
                blogSlug: post.slug,
                commentId: comment.id,
                commentParentId: comment.parentCommentId,
              },
            },
            { userId: parentComment.authorId },
          );
        }

        // Thông báo cho tác giả bài viết → gộp
        if (
          post.authorId &&
          post.authorId !== user.userId &&
          parentComment?.authorId !== post.authorId
        ) {
          await this.notificationService.upsertAggregatedAndSendToUser({
            recipientId: post.authorId,
            senderId: user.userId,
            objectId: post.id,
            type: NotificationType.BLOG_COMMENT,
            title: "Bình luận mới",
            buildMessage: (actorNames, actorCount) => {
              const others = actorCount - actorNames.length;
              if (actorCount === 1)
                return `${actorNames[0]} đã bình luận bài viết "${post.title}" của bạn.`;
              if (actorCount === 2)
                return `${actorNames[0]} và ${actorNames[1]} đã bình luận bài viết "${post.title}" của bạn.`;
              return `${actorNames.slice(0, 2).join(", ")} và ${others} người khác đã bình luận bài viết "${post.title}" của bạn.`;
            },
            payload: {
              blogId: post.id,
              blogSlug: post.slug,
              commentId: comment.id,
            },
          });
        }
      } else if (post.authorId && post.authorId !== user.userId) {
        // Bình luận gốc → gộp
        await this.notificationService.upsertAggregatedAndSendToUser({
          recipientId: post.authorId,
          senderId: user.userId,
          objectId: post.id,
          type: NotificationType.BLOG_COMMENT,
          title: "Bình luận mới",
          buildMessage: (actorNames, actorCount) => {
            const others = actorCount - actorNames.length;
            if (actorCount === 1)
              return `${actorNames[0]} đã bình luận bài viết "${post.title}" của bạn.`;
            if (actorCount === 2)
              return `${actorNames[0]} và ${actorNames[1]} đã bình luận bài viết "${post.title}" của bạn.`;
            return `${actorNames.slice(0, 2).join(", ")} và ${others} người khác đã bình luận bài viết "${post.title}" của bạn.`;
          },
          payload: {
            blogId: post.id,
            blogSlug: post.slug,
            commentId: comment.id,
          },
        });
      }
    } catch (err) {
      this.logger.warn("Failed to send comment notification", err);
    }
  }

  private normalizePagination(query: QueryBlogsDto): {
    limit: number;
    page: number;
  } {
    return {
      limit: Math.min(query.limit ?? 10, 50),
      page: Math.max(query.page ?? 1, 1),
    };
  }

  private buildPaginatedResponse<T>(
    data: T[],
    pagination: any,
  ): ApiResponse<PaginatedResult<T>> {
    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: {
        data,
        pagination,
      },
    };
  }

  private async buildPaginatedBlogsResponse(
    data: BlogPostListItem[],
    pagination: any,
  ): Promise<ApiResponse<PaginatedResult<BlogPostListItemDto>>> {
    const dataWithTags = await this.getBlogsWithTags(data);
    return this.buildPaginatedResponse(dataWithTags, pagination);
  }

  async getBlogs(
    query: QueryBlogsDto,
  ): Promise<ApiResponse<PaginatedResult<BlogPostListItemDto>>> {
    const { limit, page } = this.normalizePagination(query);
    const { data, pagination } = await this.blogRepository.getPosts({
      limit,
      page,
      keyword: query.keyword,
      category: query.category,
      status: BlogPostStatus.PUBLISHED,
      sourceType: query.sourceType,
      sortBy: query.sortBy,
    });

    return this.buildPaginatedBlogsResponse(data, pagination);
  }

  async getMyBlogs(
    userId: string,
    query: QueryBlogsDto,
  ): Promise<ApiResponse<PaginatedResult<BlogPostListItemDto>>> {
    const { limit, page } = this.normalizePagination(query);
    const { data, pagination } = await this.blogRepository.getMyBlogs(userId, {
      ...query,
      limit,
      page,
      keyword: query.keyword,
      category: query.category,
      status: query.status,
    });

    return this.buildPaginatedBlogsResponse(data, pagination);
  }

  async getSavedBlogs(
    userId: string,
    query: QueryBlogsDto,
  ): Promise<ApiResponse<PaginatedResult<BlogPostListItemDto>>> {
    const { limit } = this.normalizePagination(query);
    const { data, pagination } = await this.blogRepository.getSavedBlogs(
      userId,
      {
        ...query,
        limit,
        keyword: query.keyword,
        category: query.category,
      },
    );

    return this.buildPaginatedBlogsResponse(data, pagination);
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

  async getAdminBlogs(
    query: QueryBlogsDto,
  ): Promise<ApiResponse<PaginatedResult<BlogPostListItemDto>>> {
    const { limit, page } = this.normalizePagination(query);
    const { data, pagination } = await this.blogRepository.getPosts({
      limit,
      page,
      keyword: query.keyword,
      category: query.category,
      status: query.status,
      excludeStatus: query.status ? undefined : BlogPostStatus.DRAFT,
      sourceType: query.sourceType,
      sortBy: query.sortBy,
    });

    return this.buildPaginatedBlogsResponse(data, pagination);
  }

  async getAdminBlogById(id: string): Promise<ApiResponse<BlogPostDetailDto>> {
    await this.blogService.checkNotDraft(id);

    const post = await this.blogRepository.getPostBaseById(id);

    if (!post) {
      throw new NotFoundException({
        code: RESPONSE_CODE.BLOG_POST_NOT_FOUND,
        message: RESPONSE_MESSAGE.BLOG_POST_NOT_FOUND,
      });
    }

    const [tags, likes] = await Promise.all([
      this.blogRepository.getPostTagsByPostId(post.id),
      this.userActionRepository.getActionCount(
        post.id,
        ObjectType.BLOG,
        UserActionType.LIKE,
      ),
    ]);

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: {
        ...post,
        likes,
        tags,
        isSaved: false,
        isLiked: false,
      },
    };
  }

  async getTopBlogs(): Promise<ApiResponse<BlogPostListItemDto[]>> {
    const cacheKey = CACHE_KEYS.blog.topBlogs();
    const cached =
      await this.cacheService.getJson<BlogPostListItemDto[]>(cacheKey);
    if (cached) {
      return {
        code: RESPONSE_CODE.SUCCESS,
        message: RESPONSE_MESSAGE.SUCCESS,
        data: cached,
      };
    }

    const { data } = await this.blogRepository.getPosts({
      limit: 100,
      page: 1,
      status: BlogPostStatus.PUBLISHED,
    });

    const dataWithTags = await this.getBlogsWithTags(data);
    const result = this.blogService.calculateTopBlogs(dataWithTags);

    await this.cacheService.setJson(cacheKey, result, 600000);

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: result,
    };
  }

  async getRelatedPosts(
    slug: string,
    limit = 4,
  ): Promise<ApiResponse<BlogPostListItemDto[]>> {
    const cacheKey = CACHE_KEYS.blog.relatedPosts(slug);
    const cached =
      await this.cacheService.getJson<BlogPostListItemDto[]>(cacheKey);
    if (cached) {
      return {
        code: RESPONSE_CODE.SUCCESS,
        message: RESPONSE_MESSAGE.SUCCESS,
        data: cached,
      };
    }

    const currentPost = await this.blogRepository.getPostBaseBySlug(slug);

    if (!currentPost) {
      throw new NotFoundException({
        code: RESPONSE_CODE.BLOG_POST_NOT_FOUND,
        message: RESPONSE_MESSAGE.BLOG_POST_NOT_FOUND,
      });
    }

    const currentTags = await this.blogRepository.getPostTagsByPostId(
      currentPost.id,
    );

    const { data } = await this.blogRepository.getPosts({
      limit: 50,
      page: 1,
      status: BlogPostStatus.PUBLISHED,
    });

    const candidates = data.filter((p) => p.slug !== slug);
    const candidatesWithTags = await this.getBlogsWithTags(candidates);

    const result = this.blogService.calculateRelatedPosts(
      currentPost,
      candidatesWithTags,
      currentTags,
      limit,
    );

    await this.cacheService.setJson(cacheKey, result, 1800000);

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: result,
    };
  }

  async getCategories(): Promise<ApiResponse<BlogCategoryDto[]>> {
    const categories = await this.blogRepository.getCategories();

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: categories,
    };
  }

  async getTags(
    query: QueryBlogTagsDto,
  ): Promise<ApiResponse<BlogTagCursorResponseDto>> {
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
          nextCursor: result.pagination.nextCursor as string,
          hasNextPage: !!result.pagination.hasNextPage,
        },
      },
    };
  }

  async getBlogBySlug(
    slug: string,
    userId?: string,
  ): Promise<ApiResponse<BlogPostDetailDto>> {
    const post = await this.blogRepository.getPostBaseBySlug(slug);

    if (!post) {
      throw new NotFoundException({
        code: RESPONSE_CODE.BLOG_POST_NOT_FOUND,
        message: RESPONSE_MESSAGE.BLOG_POST_NOT_FOUND,
      });
    }

    if (
      post.status !== BlogPostStatus.PUBLISHED &&
      (!post.author || post.author.id !== userId)
    ) {
      throw new NotFoundException({
        code: RESPONSE_CODE.BLOG_POST_NOT_FOUND,
        message: RESPONSE_MESSAGE.BLOG_POST_NOT_FOUND,
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

    // [TODO] Should track view count from IP address to prevent duplicate view count
    // Update view count and mark as dirty in the cache asynchronously to avoid blocking the main response
    this.cacheService
      .increment(CACHE_KEYS.blog.viewCount(post.id), 1)
      .catch((err) =>
        this.logger.warn(
          `Failed to increment view count for blog ${post.id}: ${err.message}`,
        ),
      );
    this.cacheService
      .addToSet(CACHE_KEYS.blog.viewDirty(), post.id)
      .catch((err) =>
        this.logger.warn(
          `Failed to add to dirty set for blog ${post.id}: ${err.message}`,
        ),
      );

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: {
        ...post,
        ...actions,
        likes,
        tags,
      },
    };
  }

  async createPost(
    user: TokenPayload,
    dto: CreateBlogPostDto,
  ): Promise<ApiResponse<{ slug: string }>> {
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
          sourceType: BlogSourceType.USER,
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
    if (postId) {
      await this.blogService.checkIsAuthor(postId, user.userId);
    }

    const result = await this.blogRepository.saveDraft(
      user.userId,
      {
        title: dto.title,
        summary: dto.summary,
        content: dto.content,
        categoryId: dto.category,
        thumbnail: dto.thumbnail,
        tags: dto.tags,
      },
      postId,
    );

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: { id: result.id, slug: result.slug },
    };
  }

  async submitDraft(
    user: TokenPayload,
    postId: string,
    dto: CreateBlogPostDto,
  ): Promise<ApiResponse<{ id: string }>> {
    await this.blogService.checkIsAuthor(postId, user.userId);

    await this.blogRepository.updatePost(postId, {
      title: dto.title,
      summary: dto.summary,
      content: dto.content,
      categoryId: dto.category,
      thumbnail: dto.thumbnail,
      tags: dto.tags,
      status: BlogPostStatus.PENDING,
    });

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: { id: postId },
    };
  }

  async updatePost(
    user: TokenPayload,
    postId: string,
    dto: UpdateBlogPostDto,
  ): Promise<ApiResponse<{ id: string }>> {
    const existing = await this.blogService.checkIsAuthor(postId, user.userId);

    const status =
      (existing.status as any) === BlogPostStatus.DRAFT
        ? BlogPostStatus.DRAFT
        : BlogPostStatus.PENDING;

    await this.blogRepository.updatePost(postId, {
      title: dto.title,
      summary: dto.summary,
      content: dto.content,
      categoryId: dto.category,
      thumbnail: dto.thumbnail,
      tags: dto.tags,
      status,
    });

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: { id: postId },
    };
  }

  async deletePost(
    user: TokenPayload,
    postId: string,
  ): Promise<ApiResponse<void>> {
    await this.blogService.checkIsAuthor(postId, user.userId);

    await this.blogRepository.deletePost(postId);

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
    };
  }

  async toggleLike(
    user: TokenPayload,
    postId: string,
  ): Promise<ApiResponse<void>> {
    await this.blogService.getValidPost(postId);

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
    await this.blogService.checkPublished(postId);

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

  async updateBlogStatus(
    postId: string,
    request: UpdateBlogStatusRequest,
  ): Promise<ApiResponse<{ id: string }>> {
    const status =
      request.status === "approved"
        ? BlogPostStatus.PUBLISHED
        : BlogPostStatus.REJECTED;
    return this.reviewPost(postId, status);
  }

  private async reviewPost(
    postId: string,
    status: BlogPostStatus.PUBLISHED | BlogPostStatus.REJECTED,
  ): Promise<ApiResponse<{ id: string }>> {
    await this.blogService.checkNotDraft(postId);

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

  async createCategory(
    dto: CreateBlogCategoryDto,
  ): Promise<ApiResponse<BlogCategory>> {
    const existing = await this.blogRepository.getCategoryByName(
      dto.name.trim(),
    );
    if (existing) {
      throw new BadRequestException("Category name already exists.");
    }

    const created = await this.blogRepository.createCategory({
      name: dto.name.trim(),
      description: dto.description?.trim(),
    });

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: created,
    };
  }

  async getCategoriesPaginated(
    query: QueryBlogCategoriesDto,
  ): Promise<ApiResponse<PaginatedResult<BlogCategory>>> {
    const paginated = await this.blogRepository.getCategoriesPaginated({
      keyword: query.keyword,
      page: query.page,
      limit: query.limit,
    });

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: paginated,
    };
  }

  async createTag(dto: CreateBlogTagDto): Promise<ApiResponse<Tag>> {
    const name = dto.name.trim();
    const slug = generateSlug(name);

    const existing = await this.blogRepository.getTagByNameOrSlug(name, slug);
    if (existing) {
      throw new BadRequestException("Tag name or slug already exists.");
    }

    const created = await this.blogRepository.createTag({
      name,
      slug,
    });

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: created,
    };
  }

  async getTagsPaginated(
    query: QueryBlogTagsDto,
  ): Promise<ApiResponse<PaginatedResult<Tag>>> {
    const paginated = await this.blogRepository.getTagsPaginated({
      keyword: query.keyword,
      page: query.page,
      limit: query.limit,
    });

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: paginated,
    };
  }
}
