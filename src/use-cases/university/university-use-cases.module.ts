import { Module } from "@nestjs/common";
import { UniversityUseCases } from "./university.use-case";

@Module({
  providers: [UniversityUseCases],
  exports: [UniversityUseCases],
})
export class UniversityUseCasesModule {}
