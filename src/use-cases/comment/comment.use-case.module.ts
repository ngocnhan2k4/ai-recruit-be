import { PostgresDataServicesModule } from "@/frameworks/data-services/postgres/postgres-data-services.module";
import { BlogServiceModule } from "@/services/blog/blog.module";
import { Module } from "@nestjs/common";
import { CommentUseCases } from "./comment.use-case";

@Module({
  imports: [PostgresDataServicesModule, BlogServiceModule],
  providers: [CommentUseCases],
  exports: [CommentUseCases],
})
export class CommentUseCasesModule {}
