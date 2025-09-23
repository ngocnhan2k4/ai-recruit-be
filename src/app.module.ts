import { Module } from "@nestjs/common";
import { UserController } from "./interfaces/controllers";
import { UserUseCasesModule } from "./use-cases/user/user-use-cases.module";
import { ConfigModule } from "@nestjs/config";
import envConfig, { validateConfig } from "./common/config/env.config";
import { JobRawController } from "./interfaces/controllers/jobRaw.controller";
import { JobRawUseCasesModule } from "./use-cases/jobRaw/jobRaw-use-cases.module";

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
  ],
  controllers: [UserController, JobRawController],
  providers: [],
})
export class AppModule {}
