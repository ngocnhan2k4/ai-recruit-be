import { Module } from "@nestjs/common";
import { AuthUseCases } from "./auth.use-case";
import { FireBaseAuthServicesModule } from "@/frameworks/auth-services/firebase/firebase-auth-services.module";

@Module({
  imports: [FireBaseAuthServicesModule],
  providers: [AuthUseCases],
  exports: [AuthUseCases],
})
export class AuthUseCasesModule {}
