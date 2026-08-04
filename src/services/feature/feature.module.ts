import { Module } from "@nestjs/common";
import { FeatureService } from "./feature.service";
import { IFeatureService } from "@/core";

@Module({
  imports: [],
  providers: [
    FeatureService,
    {
      provide: IFeatureService,
      useClass: FeatureService,
    },
  ],
  exports: [IFeatureService],
})
export class FeatureModule {}
