import { Module } from "@nestjs/common";
import { CvUseCases } from "./cv.use-case";
import { CloudinaryModule } from "@/frameworks/storage/cloudinary/cloudinary.module";
import { MessageQueueModule } from "@/frameworks/message-queue/message-queue.module";
import { CvModule } from "@/services/cv/cv.module";

@Module({
  imports: [CloudinaryModule, MessageQueueModule, CvModule],
  providers: [CvUseCases],
  exports: [CvUseCases],
})
export class CvUseCasesModule {}
