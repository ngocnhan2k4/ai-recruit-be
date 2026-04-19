import { Module } from "@nestjs/common";
import { PostgresDataServicesModule } from "@/frameworks/data-services/postgres/postgres-data-services.module";
import { BlogUseCases } from "@/use-cases/blog/blog.use-case";
import { BlogService } from "@/services/blog/blog.service";

@Module({
  imports: [PostgresDataServicesModule],
  providers: [BlogService, BlogUseCases],
  exports: [BlogUseCases],
})
export class BlogUseCasesModule {}
