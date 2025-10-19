import { Module } from "@nestjs/common";
import { SkillUseCases } from "./skill.use-case";

@Module({
  providers: [SkillUseCases],
  exports: [SkillUseCases],
})
export class SkillUseCasesModule {}
