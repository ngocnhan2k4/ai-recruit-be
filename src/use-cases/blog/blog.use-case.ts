import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants";
import { CACHE_KEYS } from "@/common/constants/cache";
import { PaginatedResult, TokenPayload } from "@/common/types";
import { generateSlug } from "@/common/utils/string";
import { IAIService, ICacheService } from "@/core";
import { INotificationService } from "@/core/abstracts/notification.abstract";
import { IBlogRepository } from "@/core/abstracts/repositories/blog-repository.abstract";
import { ICommentRepository } from "@/core/abstracts/repositories/comment-repository.abstract";
import { IUserActionRepository } from "@/core/abstracts/repositories/user-action-repository.abstract";
import { IUserRepository } from "@/core/abstracts/repositories/user-repository.abstract";
import {
  BlogCategory,
  BlogGeneratedLocaleMap,
  BlogPost,
  BlogPostStatus,
  BlogSourceType,
  Comment,
  GenerateJobBlogPostResponse,
  NotificationType,
  ObjectType,
  Tag,
  UserActionType,
} from "@/core/entities";
import {
  BlogLocaleMap,
  BlogPostListItem,
  BlogPostUserActions,
} from "@/core/entities/blog.entity";
import { ApiResponse } from "@/interfaces/dtos";
import {
  BlogLocalesDto,
  CreateBlogCategoryDto,
  CreateBlogPostDto,
  CreateBlogTagDto,
  GenerateAiBlogDto,
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
import { ConfigService } from "@nestjs/config";

@Injectable()
export class BlogUseCases {
  private readonly logger = new Logger(BlogUseCases.name);
  private readonly timeZone: string;

  constructor(
    private readonly blogRepository: IBlogRepository,
    private readonly userActionRepository: IUserActionRepository,
    private readonly commentRepository: ICommentRepository,
    private readonly blogService: BlogService,
    private readonly cacheService: ICacheService,
    private readonly userRepository: IUserRepository,
    private readonly notificationService: INotificationService,
    private readonly commentService: CommentService,
    private readonly aiService: IAIService,
    private readonly configService: ConfigService,
  ) {
    this.timeZone =
      this.configService.get<string>("TIMEZONE") || "Asia/Ho_Chi_Minh";
  }

  private resolveLegacyBlogField(
    field: "title" | "summary" | "content",
    baseValue: string | undefined,
    locales?: BlogLocalesDto,
    existing?: Partial<BlogPost> | null,
  ) {
    if (baseValue !== undefined) {
      return baseValue;
    }

    const localizedValue = locales?.vi?.[field];
    if (localizedValue !== undefined) {
      return localizedValue;
    }

    return existing?.[field];
  }

  private buildLocalizedBlogLocales(params: {
    title?: string;
    summary?: string;
    content?: string;
    locales?: BlogLocalesDto;
    existing?: Partial<BlogPost> | null;
  }) {
    if (
      params.title === undefined &&
      params.summary === undefined &&
      params.content === undefined &&
      params.locales === undefined
    ) {
      return undefined;
    }

    const existingLocales = params.existing?.locales ?? {};
    const mergedLocales: BlogLocaleMap = {
      ...existingLocales,
    };

    for (const languageCode of ["vi", "en"] as const) {
      const nextLocale = params.locales?.[languageCode];
      if (!nextLocale) {
        continue;
      }

      mergedLocales[languageCode] = {
        ...(mergedLocales[languageCode] ?? {}),
        ...(nextLocale.title !== undefined ? { title: nextLocale.title } : {}),
        ...(nextLocale.summary !== undefined
          ? { summary: nextLocale.summary }
          : {}),
        ...(nextLocale.content !== undefined
          ? { content: nextLocale.content }
          : {}),
      };
    }

    const resolvedVietnameseLocale = {
      ...(mergedLocales.vi ?? {}),
      ...(params.title !== undefined ? { title: params.title } : {}),
      ...(params.summary !== undefined ? { summary: params.summary } : {}),
      ...(params.content !== undefined ? { content: params.content } : {}),
    };

    if (Object.keys(resolvedVietnameseLocale).length > 0) {
      mergedLocales.vi = resolvedVietnameseLocale;
    }

    return mergedLocales;
  }

  private buildLocalizedBlogPayload(params: {
    title?: string;
    summary?: string;
    content?: string;
    locales?: BlogLocalesDto;
    existing?: Partial<BlogPost> | null;
  }) {
    return {
      title: this.resolveLegacyBlogField(
        "title",
        params.title,
        params.locales,
        params.existing,
      ),
      summary: this.resolveLegacyBlogField(
        "summary",
        params.summary,
        params.locales,
        params.existing,
      ),
      content: this.resolveLegacyBlogField(
        "content",
        params.content,
        params.locales,
        params.existing,
      ),
      locales: this.buildLocalizedBlogLocales(params),
    };
  }

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

        // Thông báo reply → chỉ thông báo tới tác giả comment cha, không thông báo tới tác giả bài viết
        if (parentComment?.authorId && parentComment.authorId !== user.userId) {
          await this.notificationService.createAndSendToUser(
            {
              title: "Phản hồi bình luận",
              message: `${commenterName} đã trả lời bình luận của bạn trong bài viết ${post.title}.`,
              templateKey: "blog_comment_reply",
              templateData: {
                commenterName,
                postTitle: post.title,
              },
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
          templateKey: "blog_comment_aggregated",
          buildTemplateData: (actorNames, actorCount) => ({
            actorNames,
            actorCount,
            postTitle: post.title,
          }),
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
      ...query,
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
      sortBy: query.sortBy,
      sortDirection: query.sortDirection,
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

  private stripLocalesContent(
    locales?: BlogLocaleMap,
  ): BlogLocaleMap | undefined {
    if (!locales) return undefined;

    const slim: BlogLocaleMap = {};
    for (const [lang, value] of Object.entries(locales)) {
      if (!value) continue;
      slim[lang] = {
        ...(value.title !== undefined ? { title: value.title } : {}),
        ...(value.summary !== undefined ? { summary: value.summary } : {}),
      };
    }
    return slim;
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
      locales: this.stripLocalesContent(blog.locales),
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
    const { data } = await this.blogRepository.getPosts({
      limit: 100,
      page: 1,
      status: BlogPostStatus.PUBLISHED,
    });

    const dataWithTags = await this.getBlogsWithTags(data);
    const result = this.blogService.calculateTopBlogs(dataWithTags);

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
    const localizedPayload = this.buildLocalizedBlogPayload({
      title: dto.title,
      summary: dto.summary,
      content: dto.content,
      locales: dto.locales,
    });
    const result = await this.blogRepository.executeWithTransaction(
      async () => {
        const baseSlug = generateSlug(dto.title);
        const existed = await this.blogRepository.getPostBySlug(baseSlug);
        const slug = existed ? `${baseSlug}-${Date.now()}` : baseSlug;

        return this.blogRepository.createPost({
          title: localizedPayload.title!,
          slug,
          summary: localizedPayload.summary!,
          thumbnail: dto.thumbnail ?? null,
          content: localizedPayload.content!,
          locales: localizedPayload.locales ?? {},
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
      const existing = await this.blogRepository.get(postId);
      if (!existing) {
        throw new NotFoundException({
          code: RESPONSE_CODE.BLOG_POST_NOT_FOUND,
          message: RESPONSE_MESSAGE.BLOG_POST_NOT_FOUND,
        });
      }
      if (existing.authorId !== user.userId) {
        throw new BadRequestException(
          "You are not the author of this blog post",
        );
      }
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
    const existing = await this.blogRepository.get(postId);
    if (!existing) {
      throw new NotFoundException({
        code: RESPONSE_CODE.BLOG_POST_NOT_FOUND,
        message: RESPONSE_MESSAGE.BLOG_POST_NOT_FOUND,
      });
    }

    if (existing.authorId !== user.userId) {
      throw new BadRequestException("You are not the author of this blog post");
    }

    const baseSlug = generateSlug(dto.title);
    const existed = await this.blogRepository.getPostBySlug(baseSlug);
    const slug =
      existed && existed.id !== postId ? `${baseSlug}-${Date.now()}` : baseSlug;

    const localizedPayload = this.buildLocalizedBlogPayload({
      title: dto.title,
      summary: dto.summary,
      content: dto.content,
      locales: dto.locales,
      existing,
    });

    await this.blogRepository.updatePost(postId, {
      title: localizedPayload.title,
      summary: localizedPayload.summary,
      content: localizedPayload.content,
      locales: localizedPayload.locales ?? {},
      categoryId: dto.category,
      thumbnail: dto.thumbnail ?? null,
      tags: dto.tags,
      status: BlogPostStatus.PENDING,
      slug,
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
    const localizedPayload = this.buildLocalizedBlogPayload({
      title: dto.title,
      summary: dto.summary,
      content: dto.content,
      locales: dto.locales,
      existing,
    });

    await this.blogRepository.updatePost(postId, {
      title: localizedPayload.title,
      summary: localizedPayload.summary,
      content: localizedPayload.content,
      locales: localizedPayload.locales,
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

  async generateWeeklyAiBlog(input: GenerateAiBlogDto = {}): Promise<
    ApiResponse<{
      created: boolean;
      slug: string;
      postId?: string;
      asOf: string;
      reason?: string;
    }>
  > {
    const asOf = this.resolveAsOfDate(input.date);
    const dateKey = this.formatVietnamDate(asOf);
    const slug = `weekly-ai-job-market-${dateKey}`;
    const aiBlogAuthorId =
      this.configService.get<string>("AI_BLOG_AUTHOR_ID") || undefined;
    const aiBlogRangeDays = Math.max(
      1,
      this.configService.get<number>("AI_BLOG_RANGE_DAYS") || 7,
    );

    this.logger.log(
      `[generateWeeklyAiBlog] Starting AI blog generation asOf=${dateKey}`,
    );

    if (!aiBlogAuthorId) {
      throw new BadRequestException({
        message: "AI_BLOG_AUTHOR_ID is not configured",
        code: RESPONSE_CODE.BAD_REQUEST,
      });
    }

    const author = await this.userRepository.get(aiBlogAuthorId);
    if (!author) {
      throw new NotFoundException({
        message: `AI blog author ${aiBlogAuthorId} was not found`,
        code: RESPONSE_CODE.USER_NOT_FOUND,
      });
    }

    const existing = await this.blogRepository.getPostBySlug(slug);
    if (existing) {
      this.logger.log(
        `[generateWeeklyAiBlog] Skipping because slug ${slug} already exists`,
      );
      return {
        code: RESPONSE_CODE.SUCCESS,
        message: RESPONSE_MESSAGE.SUCCESS,
        data: {
          created: false,
          slug,
          postId: existing.id,
          asOf: dateKey,
          reason: "already_exists",
        },
      };
    }

    const payload = await this.aiService.generateJobBlogPost({
      rangeDays: aiBlogRangeDays,
      asOf: dateKey,
    });

    const categoryId = payload.categoryId ?? payload.category;
    if (!categoryId) {
      throw new BadRequestException({
        message: "AI payload did not include a categoryId",
        code: RESPONSE_CODE.BAD_REQUEST,
      });
    }

    const normalizedTags = (payload.tagInputs || [])
      .filter((item) => item.tagId || item.skillId)
      .map((item) => ({
        tagId: item.tagId ?? null,
        skillId: item.skillId ?? null,
      }));

    const created = await this.blogRepository.createPost({
      title: payload.title,
      slug,
      summary: payload.summary,
      thumbnail: payload.thumbnail ?? null,
      content: payload.content,
      locales: this.buildGeneratedBlogLocales(payload),
      categoryId,
      authorId: author.id,
      status: BlogPostStatus.PENDING,
      sourceType: BlogSourceType.AI,
      tags: normalizedTags,
    });

    this.logger.log(
      `[generateWeeklyAiBlog] Created AI blog successfully with slug ${slug}`,
    );

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: {
        created: true,
        slug,
        postId: created.id,
        asOf: dateKey,
      },
    };
  }

  private buildGeneratedBlogLocales(
    payload: GenerateJobBlogPostResponse,
  ): BlogGeneratedLocaleMap {
    const locales: BlogGeneratedLocaleMap = {};

    for (const languageCode of ["vi", "en"] as const) {
      locales[languageCode] = {
        title: payload.locales?.[languageCode]?.title ?? payload.title,
        summary: payload.locales?.[languageCode]?.summary ?? payload.summary,
        content: payload.locales?.[languageCode]?.content ?? payload.content,
      };
    }

    return locales;
  }

  private resolveAsOfDate(dateInput?: string): Date {
    if (!dateInput) {
      return new Date();
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateInput);
    if (!match) {
      throw new BadRequestException({
        message: "date must be YYYY-MM-DD",
        code: RESPONSE_CODE.BAD_REQUEST,
      });
    }

    const [, year, month, day] = match;
    const parsed = new Date(
      Date.UTC(Number(year), Number(month) - 1, Number(day)),
    );
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException({
        message: "Invalid date",
        code: RESPONSE_CODE.BAD_REQUEST,
      });
    }

    return parsed;
  }

  private formatVietnamDate(date: Date): string {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: this.timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }
}
