import { Module } from "@nestjs/common";
import { CasbinUseCases } from "./casbin.use-case";
import { CasbinModule } from "@/frameworks/auth-services/casbin/casbin.module";

@Module({
  imports: [CasbinModule],
  providers: [CasbinUseCases],
  exports: [CasbinUseCases],
})
export class CasbinUseCasesModule {}
