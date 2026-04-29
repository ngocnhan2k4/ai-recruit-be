import { Module } from "@nestjs/common";
import { SkillService } from "./skill.service";
import { ISkillService } from "@/core";

@Module({
  imports: [],
  providers: [
    SkillService,
    {
      provide: ISkillService,
      useClass: SkillService,
    },
  ],
  exports: [ISkillService],
})
export class SkillModule {}
