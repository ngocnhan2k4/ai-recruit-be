import { Module } from "@nestjs/common";
import { CvUseCases } from "./cv.use-case";
import { CvOptimizeUseCase } from "./cv-optimize.use-case";
import { StorageModule } from "../storage/storage.module";
import { AIServicesModule } from "@/frameworks/ai-services/ai-services.module";

@Module({
  imports: [StorageModule, AIServicesModule],
  providers: [CvUseCases, CvOptimizeUseCase],
  exports: [CvUseCases, CvOptimizeUseCase],
})
export class CvUseCasesModule {}
