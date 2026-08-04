import { Module } from "@nestjs/common";
import { BlogUseCases } from "@/use-cases/blog/blog.use-case";
import { BlogService } from "@/services/blog/blog.service";
import { RedisModule } from "@/frameworks/redis/redis.module";
import { NotificationModule } from "@/frameworks/notification/notification.module";
import { CommentServiceModule } from "@/services/comment/comment.module";
import { AIServicesModule } from "@/frameworks/ai-services/ai-services.module";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [
    RedisModule,
    NotificationModule,
    CommentServiceModule,
    AIServicesModule,
    ConfigModule,
  ],
  providers: [BlogService, BlogUseCases],
  exports: [BlogUseCases],
})
export class BlogUseCasesModule {}
