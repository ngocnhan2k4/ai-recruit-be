import { Module } from "@nestjs/common";
import { OrganizationUseCase } from "./organization.use-case";
import { CloudinaryModule } from "@/frameworks/storage/cloudinary/cloudinary.module";
import { OtpModule } from "@/frameworks/otp-services/otp.module";
import { EmailModule } from "@/frameworks/email-services/email.module";

@Module({
  imports: [CloudinaryModule, OtpModule, EmailModule],
  providers: [OrganizationUseCase],
  exports: [OrganizationUseCase],
})
export class OrganizationUseCasesModule {}
