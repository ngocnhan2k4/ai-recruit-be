import { Module } from "@nestjs/common";
import { BlogUseCases } from "@/use-cases/blog/blog.use-case";
import { BlogService } from "@/services/blog/blog.service";
import { RedisModule } from "@/frameworks/redis/redis.module";
import { MessageQueueModule } from "@/frameworks/message-queue/message-queue.module";

@Module({
  imports: [RedisModule, MessageQueueModule],
  providers: [BlogService, BlogUseCases],
  exports: [BlogUseCases],
})
export class BlogUseCasesModule {}
