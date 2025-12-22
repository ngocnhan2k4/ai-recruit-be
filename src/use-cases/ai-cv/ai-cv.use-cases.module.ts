import { Module } from "@nestjs/common";
import { AiCvUseCases } from "./ai-cv.use-cases";
import { AIServicesModule } from "@/frameworks/ai-services/ai-services.module";
import { AiCvOptimizeUseCases } from "./ai-cv-optimize.use-case";
import { AiCvSuggestFieldUseCases } from "./ai-cv-suggest.use-case";

@Module({
  imports: [AIServicesModule],
  providers: [AiCvUseCases, AiCvOptimizeUseCases, AiCvSuggestFieldUseCases],
  exports: [AiCvUseCases, AiCvOptimizeUseCases, AiCvSuggestFieldUseCases],
})
export class AiCvUseCasesModule {}
