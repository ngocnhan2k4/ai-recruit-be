import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import {
  BlogPostStatus,
  GenerateJobBlogPostResponse,
  IAIService,
  IBlogRepository,
  ICacheService,
  IUserRepository,
} from "@/core";
import { CACHE_KEYS } from "@/common/constants";

@Injectable()
export class BlogScheduler {
  private readonly logger = new Logger(BlogScheduler.name);
  private readonly aiBlogAuthorId?: string;
  private readonly aiBlogRangeDays: number;

  constructor(
    private readonly cacheService: ICacheService,
    private readonly blogRepository: IBlogRepository,
    private readonly userRepository: IUserRepository,
    private readonly aiService: IAIService,
    private readonly configService: ConfigService,
  ) {
    this.aiBlogAuthorId =
      this.configService.get<string>("AI_BLOG_AUTHOR_ID") || undefined;
    this.aiBlogRangeDays = Math.max(
      1,
      this.configService.get<number>("AI_BLOG_RANGE_DAYS") || 7,
    );
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async syncBlogViewCount(): Promise<void> {
    try {
      this.logger.log("Running scheduled blog view count sync cron job...");
      const postIds = await this.cacheService.getSetMembers(
        CACHE_KEYS.blog.viewDirty(),
      );

      if (postIds.length === 0) {
        return;
      }

      const lua = `
      local result = {}
      for i, key in ipairs(KEYS) do
        local val = redis.call("GET", key)
        if val then
          redis.call("DEL", key)
          table.insert(result, val)
        else
          table.insert(result, "0")
        end
      end
      return result
    `;

      const keys = postIds.map(CACHE_KEYS.blog.viewCount);
      const values: string[] = await this.cacheService.eval(
        lua,
        keys.length,
        ...keys,
      );

      // 3. build updates
      const updates: { postId: string; viewCount: number }[] = [];

      for (let i = 0; i < postIds.length; i++) {
        const count = Number(values[i] ?? "0");
        if (count > 0) {
          updates.push({
            postId: postIds[i],
            viewCount: count,
          });
        }
      }

      // 4. update DB (batch)
      if (updates.length > 0) {
        await this.blogRepository.incrementViewCount(updates);
      }

      // 5. remove post ids from dirty set
      await this.cacheService.removeFromSet(
        CACHE_KEYS.blog.viewDirty(),
        ...postIds,
      );

      this.logger.log(`Synced ${JSON.stringify(updates)} blog view counts`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to sync blog view counts: ${err.message}`,
        err.stack,
      );
    }
  }

  @Cron("0 0 0 * * 0", {
    timeZone: "Asia/Ho_Chi_Minh",
  })
  async generateWeeklyAiBlog(): Promise<void> {
    try {
      this.logger.log(
        "Running scheduled weekly AI blog generation cron job...",
      );

      if (!this.aiBlogAuthorId) {
        this.logger.warn(
          "Skipping weekly AI blog generation because AI_BLOG_AUTHOR_ID is not configured.",
        );
        return;
      }

      const author = await this.userRepository.get(this.aiBlogAuthorId);
      if (!author) {
        this.logger.warn(
          `Skipping weekly AI blog generation because author ${this.aiBlogAuthorId} was not found.`,
        );
        return;
      }

      const dateKey = this.formatVietnamDate(new Date());
      const slug = `weekly-ai-job-market-${dateKey}`;
      const existing = await this.blogRepository.getPostBySlug(slug);
      if (existing) {
        this.logger.log(
          `Skipping weekly AI blog generation because slug ${slug} already exists.`,
        );
        return;
      }

      const payload = await this.requestWeeklyAiBlog();
      const normalizedTags = (payload.tagInputs || [])
        .filter((item) => item.tagId || item.skillId)
        .map((item) => ({
          tagId: item.tagId ?? null,
          skillId: item.skillId ?? null,
        }));

      await this.blogRepository.createPost({
        title: payload.title,
        slug,
        summary: payload.summary,
        thumbnail: payload.thumbnail ?? null,
        content: payload.content,
        categoryId: payload.category,
        authorId: author.id,
        status: BlogPostStatus.PENDING,
        tags: normalizedTags,
      });

      this.logger.log(`Created weekly AI blog successfully with slug ${slug}.`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to generate weekly AI blog: ${err.message}`,
        err.stack,
      );
    }
  }

  private async requestWeeklyAiBlog(): Promise<GenerateJobBlogPostResponse> {
    return this.aiService.generateJobBlogPost({
      rangeDays: this.aiBlogRangeDays,
    });
  }

  private formatVietnamDate(date: Date): string {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }
}
