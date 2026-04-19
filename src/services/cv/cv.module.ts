import { Module } from "@nestjs/common";
import { CvService } from "./cv.service";

@Module({
  imports: [],
  providers: [CvService],
  exports: [CvService],
})
export class CvModule {}
