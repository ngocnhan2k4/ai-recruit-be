import { Module } from "@nestjs/common";
import { CvUseCases } from "./cv.use-case";
import { CloudinaryModule } from "@/frameworks/storage/cloudinary/cloudinary.module";

@Module({
  imports: [CloudinaryModule],
  providers: [CvUseCases],
  exports: [CvUseCases],
})
export class CvUseCasesModule {}
