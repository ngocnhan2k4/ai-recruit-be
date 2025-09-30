import { Module } from "@nestjs/common";
import {
  UserController,
  AuthController,
  UploadController,
} from "./interfaces/controllers";
import { UserUseCasesModule } from "./use-cases/user/user-use-cases.module";
import { ConfigModule } from "@nestjs/config";
import envConfig, { validateConfig } from "./common/config/env.config";
import { AuthUseCasesModule } from "./use-cases/auth/auth-use-cases.module";
import { CasbinModule } from "./frameworks/auth-services/casbin/casbin.module";
import { JwtStrategy } from "./frameworks/auth-services/strategies/jwt.strategy";
import { CategoryController } from "./interfaces/controllers/category.controller";
import { CategoryUseCasesModule } from "./use-cases/category/category-use-cases.module";
import { JobController } from "./interfaces/controllers/job.controller";
import { JobUseCasesModule } from "./use-cases/job/job-use-cases.module";
import { CloudinaryModule } from "./frameworks/storage/cloudinary/cloudinary.module";
import { StorageModule } from "./use-cases/storage/storage.module";

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
    CloudinaryModule,
    StorageModule,
  ],
  controllers: [
    UserController,
    AuthController,
    JobController,
    CategoryController,
    UploadController,
  ],
  providers: [JwtStrategy],
})
export class AppModule {}
