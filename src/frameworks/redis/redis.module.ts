import { Module, Logger } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Redis } from "ioredis";
import { RedisService } from "./redis.service";
import { IRedisService } from "@/core/abstracts/redis.abstract";

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
          retryStrategy(times) {
            logger.log(`Redis connection attempt ${times}`);
            if (times >= 3) {
              return null;
            }
            return Math.min(times * 1000, 5000);
          },
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
      provide: IRedisService,
      useClass: RedisService,
    },
  ],
  exports: [IRedisService],
})
export class RedisModule {}
