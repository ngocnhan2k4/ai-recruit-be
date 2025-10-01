import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { CloudinaryService } from "@/frameworks/storage/cloudinary/cloudinary.service";
import { StorageUseCase } from "./storage.use-case";

@Module({
  imports: [
    MulterModule.register({
      dest: "./uploads",
    }),
  ],
  providers: [CloudinaryService, StorageUseCase],
  exports: [CloudinaryService, StorageUseCase],
})
export class StorageModule {}
