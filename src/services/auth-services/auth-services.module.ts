import { Module } from "@nestjs/common";
import { FireBaseAuthServicesModule } from "@/frameworks/auth-services/firebase/firebase-auth-services.module";

@Module({
  imports: [FireBaseAuthServicesModule],
  exports: [FireBaseAuthServicesModule],
})
export class AuthServicesModule {}
