import { Module } from "@nestjs/common";
import { ExamUseCases } from "./exam.use-case";
import {
  QuestionImportService,
  QuestionRandomizerService,
  ExamScoringService,
} from "./services";

@Module({
  providers: [
    ExamUseCases,
    QuestionImportService,
    QuestionRandomizerService,
    ExamScoringService,
  ],
  exports: [ExamUseCases],
})
export class ExamUseCasesModule {}
