import { Module } from "@nestjs/common";
import { UserController, AuthController } from "./interfaces/controllers";
import { UserUseCasesModule } from "./use-cases/user/user-use-cases.module";
import { ConfigModule } from "@nestjs/config";
import envConfig, { validateConfig } from "./common/config/env.config";
import { JobRawController } from "./interfaces/controllers/jobRaw.controller";
import { JobRawUseCasesModule } from "./use-cases/jobRaw/jobRaw-use-cases.module";
import { AuthUseCasesModule } from "./use-cases/auth/auth-use-cases.module";
import { CasbinModule } from "./frameworks/auth-services/casbin/casbin.module";
import { JwtStrategy } from "./frameworks/auth-services/strategies/jwt.strategy";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", ".env.development", ".env.production"],
      load: [envConfig],
      validate: validateConfig,
    }),
    UserUseCasesModule,
    JobRawUseCasesModule,
    AuthUseCasesModule,
    CasbinModule,
  ],
  controllers: [UserController, AuthController, JobRawController],
  providers: [JwtStrategy],
})
export class AppModule {}
