import { Module } from "@nestjs/common";
import { CvService } from "./cv.service";
import { AIServicesModule } from "@/frameworks/ai-services/ai-services.module";
import { SkillModule } from "@/services/skill/skill.module";
import { ICvService } from "@/core/abstracts";

@Module({
  imports: [AIServicesModule, SkillModule],
  providers: [
    CvService,
    {
      provide: ICvService,
      useClass: CvService,
    },
  ],
  exports: [ICvService],
})
export class CvModule {}
