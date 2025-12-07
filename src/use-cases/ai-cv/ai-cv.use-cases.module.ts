import { Module } from "@nestjs/common";
import { AiCvUseCases } from "./ai-cv.use-cases";

@Module({
  providers: [AiCvUseCases],
  exports: [AiCvUseCases],
})
export class AiCvUseCasesModule {}
