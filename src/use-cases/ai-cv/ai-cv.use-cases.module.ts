import { Module } from "@nestjs/common";
import { AiCvUseCases } from "./ai-cv.use-cases";
import { AIServicesModule } from "@/frameworks/ai-services/ai-services.module";

@Module({
  imports: [AIServicesModule],
  providers: [AiCvUseCases],
  exports: [AiCvUseCases],
})
export class AiCvUseCasesModule {}
