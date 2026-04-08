import { Module } from "@nestjs/common";
import { AiCvUseCases } from "./ai-cv.use-cases";
import { AIServicesModule } from "@/frameworks/ai-services/ai-services.module";
import { FeatureModule } from "@/services";

@Module({
  imports: [AIServicesModule, FeatureModule],
  providers: [AiCvUseCases],
  exports: [AiCvUseCases],
})
export class AiCvUseCasesModule {}
