import { Module } from "@nestjs/common";
import { CvService } from "./cv.service";
import { AIServicesModule } from "@/frameworks/ai-services/ai-services.module";

@Module({
  imports: [AIServicesModule],
  providers: [CvService],
  exports: [CvService],
})
export class CvModule {}
