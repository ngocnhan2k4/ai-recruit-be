import { Module } from "@nestjs/common";
import { FeedbackUseCase } from "./feedback.use-case";

@Module({
  providers: [FeedbackUseCase],
  exports: [FeedbackUseCase],
})
export class FeedbackUseCasesModule {}
