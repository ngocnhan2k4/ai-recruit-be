import { Module } from "@nestjs/common";
import { BlogUseCases } from "@/use-cases/blog/blog.use-case";
import { BlogService } from "@/services/blog/blog.service";
import { RedisModule } from "@/frameworks/redis/redis.module";

@Module({
  imports: [RedisModule],
  providers: [BlogService, BlogUseCases],
  exports: [BlogUseCases],
})
export class BlogUseCasesModule {}
