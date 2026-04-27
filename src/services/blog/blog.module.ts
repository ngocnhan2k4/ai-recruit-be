import { Module } from "@nestjs/common";
import { BlogService } from "./blog.service";
import { PostgresDataServicesModule } from "@/frameworks/data-services/postgres/postgres-data-services.module";

@Module({
  imports: [PostgresDataServicesModule],
  providers: [BlogService],
  exports: [BlogService],
})
export class BlogServiceModule {}
