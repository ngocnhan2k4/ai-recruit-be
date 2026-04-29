import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { IBlogRepository, ICacheService } from "@/core";
import { CACHE_KEYS } from "@/common/constants";

@Injectable()
export class BlogScheduler {
  private readonly logger = new Logger(BlogScheduler.name);

  constructor(
    private readonly cacheService: ICacheService,
    private readonly blogRepository: IBlogRepository,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
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
}
