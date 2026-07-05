import { Module } from "@nestjs/common";
import { SkillUseCases } from "./skill.use-case";
import { PostgresDataServicesModule } from "../../frameworks/data-services/postgres/postgres-data-services.module";
import { MessageQueueModule } from "../../frameworks/message-queue/message-queue.module";

@Module({
  imports: [PostgresDataServicesModule, MessageQueueModule],
  providers: [SkillUseCases],
  exports: [SkillUseCases],
})
export class SkillUseCasesModule {}
