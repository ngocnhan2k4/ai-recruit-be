import { Module } from "@nestjs/common";
import { DataServicesModule } from "@/services/data-services/data-services.module";
import { UserFactoryService } from "./user-factory.service";
import { UserUseCases } from "./user.use-case";
import { CloudinaryModule } from "@/frameworks/storage/cloudinary/cloudinary.module";

@Module({
  imports: [DataServicesModule, CloudinaryModule],
  providers: [UserFactoryService, UserUseCases],
  exports: [UserUseCases],
})
export class UserUseCasesModule {}
