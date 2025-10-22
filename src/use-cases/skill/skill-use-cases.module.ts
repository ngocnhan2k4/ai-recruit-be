import { Module } from "@nestjs/common";
import { SkillUseCases } from "./skill.use-case";
import { PostgresDataServicesModule } from "../../frameworks/data-services/postgres/postgres-data-services.module";

@Module({
  imports: [PostgresDataServicesModule],
  providers: [SkillUseCases],
  exports: [SkillUseCases],
})
export class SkillUseCasesModule {}
