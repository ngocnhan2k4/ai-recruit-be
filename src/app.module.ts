import { Module } from "@nestjs/common";
import { UserController, AuthController } from "./interfaces/controllers";
import { UserUseCasesModule } from "./use-cases/user/user-use-cases.module";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import envConfig, { validateConfig } from "./common/config/env.config";
import { AuthUseCasesModule } from "./use-cases/auth/auth-use-cases.module";
import { CasbinModule } from "./frameworks/auth-services/casbin/casbin.module";
import { JwtStrategy } from "./frameworks/auth-services/strategies/jwt.strategy";
import { CategoryController } from "./interfaces/controllers/category.controller";
import { CategoryUseCasesModule } from "./use-cases/category/category-use-cases.module";
import { JobController } from "./interfaces/controllers/job.controller";
import { JobUseCasesModule } from "./use-cases/job/job-use-cases.module";
import { RedisModule } from "./frameworks/redis/redis.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", ".env.development", ".env.production"],
      load: [envConfig],
      validate: validateConfig,
    }),
    ScheduleModule.forRoot(),
    RedisModule,
    UserUseCasesModule,
    JobUseCasesModule,
    AuthUseCasesModule,
    CasbinModule,
    CategoryUseCasesModule,
  ],
  controllers: [
    UserController,
    AuthController,
    JobController,
    CategoryController,
  ],
  providers: [JwtStrategy],
})
export class AppModule {}
