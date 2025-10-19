import { Module } from "@nestjs/common";
import { CvUseCases } from "./cv.use-case";
import { StorageModule } from "../storage/storage.module";

@Module({
  imports: [StorageModule],
  providers: [CvUseCases],
  exports: [CvUseCases],
})
export class CvUseCasesModule {}
