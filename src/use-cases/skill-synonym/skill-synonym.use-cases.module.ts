import { Module } from "@nestjs/common";
import { SkillSynonymUseCases } from "./skill-synonym.use-case";
import { SkillModule } from "@/services/skill/skill.module";
import { MessageQueueModule } from "@/frameworks/message-queue/message-queue.module";

@Module({
  imports: [SkillModule, MessageQueueModule],
  providers: [SkillSynonymUseCases],
  exports: [SkillSynonymUseCases],
})
export class SkillSynonymUseCasesModule {}
