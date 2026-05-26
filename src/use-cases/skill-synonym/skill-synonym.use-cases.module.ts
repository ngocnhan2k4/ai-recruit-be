import { Module } from "@nestjs/common";
import { SkillSynonymUseCases } from "./skill-synonym.use-case";
import { SkillModule } from "@/services/skill/skill.module";

@Module({
  imports: [SkillModule],
  providers: [SkillSynonymUseCases],
  exports: [SkillSynonymUseCases],
})
export class SkillSynonymUseCasesModule {}
