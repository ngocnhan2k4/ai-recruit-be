import { Module } from "@nestjs/common";
import {
  UserController,
  AuthController,
  UploadController,
  HealthController,
  CategoryController,
  JobController,
} from "./interfaces/controllers";
import { UserUseCasesModule } from "./use-cases/user/user-use-cases.module";
import { ConfigModule } from "@nestjs/config";
import envConfig, { validateConfig } from "./common/config/env.config";
import { AuthUseCasesModule } from "./use-cases/auth/auth-use-cases.module";
import { CasbinModule } from "./frameworks/auth-services/casbin/casbin.module";
import { JwtStrategy } from "./frameworks/auth-services/strategies/jwt.strategy";
import { CategoryUseCasesModule } from "./use-cases/category/category-use-cases.module";
import { JobUseCasesModule } from "./use-cases/job/job-use-cases.module";
import { StorageModule } from "./frameworks/storage/storage.module";
import { TerminusModule } from "@nestjs/terminus";
import { HttpModule } from "@nestjs/axios";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", ".env.development", ".env.production"],
      load: [envConfig],
      validate: validateConfig,
    }),
    UserUseCasesModule,
    JobUseCasesModule,
    AuthUseCasesModule,
    CasbinModule,
    CategoryUseCasesModule,
    StorageModule,
    TerminusModule,
    HttpModule,
  ],
  controllers: [
    UserController,
    AuthController,
    JobController,
    CategoryController,
    UploadController,
    HealthController,
  ],
  providers: [JwtStrategy],
})
export class AppModule {}
