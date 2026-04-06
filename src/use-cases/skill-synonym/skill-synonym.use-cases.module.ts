import { Module } from "@nestjs/common";
import { SkillSynonymUseCases } from "./skill-synonym";
import { PostgresDataServicesModule } from "@/frameworks/data-services/postgres/postgres-data-services.module";

@Module({
  imports: [PostgresDataServicesModule],
  providers: [SkillSynonymUseCases],
  exports: [SkillSynonymUseCases],
})
export class SkillSynonymUseCasesModule {}
