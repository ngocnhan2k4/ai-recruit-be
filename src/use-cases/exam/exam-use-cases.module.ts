import { Module } from "@nestjs/common";
import { ExamUseCases } from "./exam.use-case";
import {
  QuestionImportService,
  QuestionRandomizerService,
  ExamScoringService,
} from "./services";
import { MessageQueueModule } from "@/frameworks/message-queue/message-queue.module";

@Module({
  imports: [MessageQueueModule],
  providers: [
    ExamUseCases,
    QuestionImportService,
    QuestionRandomizerService,
    ExamScoringService,
  ],
  exports: [ExamUseCases],
})
export class ExamUseCasesModule {}
