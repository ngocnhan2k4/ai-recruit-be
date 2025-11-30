import { Module } from "@nestjs/common";
import { OrganizationUseCase } from "./organization.use-case";
import { CloudinaryModule } from "@/frameworks/storage/cloudinary/cloudinary.module";

@Module({
  imports: [CloudinaryModule],
  providers: [OrganizationUseCase],
  exports: [OrganizationUseCase],
})
export class OrganizationUseCasesModule {}
