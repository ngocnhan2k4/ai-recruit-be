import { Module } from "@nestjs/common";
import { CommentService } from "./comment.service";
import { PostgresDataServicesModule } from "@/frameworks/data-services/postgres/postgres-data-services.module";

@Module({
  imports: [PostgresDataServicesModule],
  providers: [CommentService],
  exports: [CommentService],
})
export class CommentServiceModule {}
