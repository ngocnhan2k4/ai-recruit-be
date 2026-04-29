import { Module } from "@nestjs/common";
import { CvService } from "./cv.service";
import { AIServicesModule } from "@/frameworks/ai-services/ai-services.module";
import { SkillModule } from "@/services/skill/skill.module";

@Module({
  imports: [AIServicesModule, SkillModule],
  providers: [CvService],
  exports: [CvService],
})
export class CvModule {}
