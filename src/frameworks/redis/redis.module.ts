import { Module, Logger } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Redis } from "ioredis";
import { RedisService } from "./redis.service";
import { ICacheService } from "@/core/abstracts/cache.abstract";

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: "REDIS_CLIENT",
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger("RedisModule");
        const redis = new Redis({
          host: configService.get<string>("REDIS_HOST"),
          port: configService.get<number>("REDIS_PORT"),
          password: configService.get<string>("REDIS_PASSWORD"),
          db: configService.get<number>("REDIS_DB"),
          maxRetriesPerRequest: 3,
        });

        redis.on("connect", () => {
          logger.log("✅ Redis connected");
        });

        redis.on("error", (err) => {
          logger.error("❌ Redis connection error:", err);
        });

        // Test ping
        try {
          const pong = await redis.ping();
          logger.log("Redis PING response:", pong); // "PONG"
        } catch (err) {
          logger.error("Failed to PING Redis:", err);
        }

        return redis;
      },
      inject: [ConfigService],
    },
    RedisService,
    {
      provide: ICacheService,
      useClass: RedisService,
    },
  ],
  exports: [ICacheService],
})
export class RedisModule {}
