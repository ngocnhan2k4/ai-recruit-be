import { Module } from "@nestjs/common";
import { PostgresDataServicesModule } from "@/frameworks/data-services/postgres/postgres-data-services.module";
import { BlogUseCases } from "@/use-cases/blog/blog.use-case";

@Module({
  imports: [PostgresDataServicesModule],
  providers: [BlogUseCases],
  exports: [BlogUseCases],
})
export class BlogUseCasesModule {}
