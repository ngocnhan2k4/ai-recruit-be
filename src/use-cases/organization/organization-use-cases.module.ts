import { Module } from "@nestjs/common";
import { OrganizationUseCase } from "./organization.use-case";
import { CloudinaryModule } from "@/frameworks/storage/cloudinary/cloudinary.module";
import { OtpModule } from "@/frameworks/otp-services/otp.module";
import { EmailModule } from "@/frameworks/email-services/email.module";
import { CasbinModule } from "@/frameworks/auth-services/casbin/casbin.module";
import { MessageQueueModule } from "@/frameworks/message-queue/message-queue.module";

@Module({
  imports: [
    CloudinaryModule,
    OtpModule,
    EmailModule,
    CasbinModule,
    MessageQueueModule,
  ],
  providers: [OrganizationUseCase],
  exports: [OrganizationUseCase],
})
export class OrganizationUseCasesModule {}
