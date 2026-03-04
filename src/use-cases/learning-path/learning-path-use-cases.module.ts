import { Module } from "@nestjs/common";
import { LearningPathUseCase } from "./learning-path.use-case";
import { AIServicesModule } from "@/frameworks/ai-services/ai-services.module";

@Module({
  imports: [AIServicesModule],
  providers: [LearningPathUseCase],
  exports: [LearningPathUseCase],
})
export class LearningPathUseCasesModule {}
