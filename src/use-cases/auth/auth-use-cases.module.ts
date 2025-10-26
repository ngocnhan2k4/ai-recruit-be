import { Module } from "@nestjs/common";
import { AuthUseCases } from "./auth.use-case";
import { FireBaseAuthServicesModule } from "@/frameworks/auth-services/firebase/firebase-auth-services.module";
import { CasbinModule } from "@/frameworks/auth-services/casbin/casbin.module";

@Module({
  imports: [FireBaseAuthServicesModule, CasbinModule],
  providers: [AuthUseCases],
  exports: [AuthUseCases],
})
export class AuthUseCasesModule {}
