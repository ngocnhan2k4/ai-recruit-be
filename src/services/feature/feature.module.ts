import { Module } from "@nestjs/common";
import { FeatureService } from "./feature.service";

@Module({
  imports: [],
  providers: [FeatureService],
  exports: [FeatureService],
})
export class FeatureModule {}
