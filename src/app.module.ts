import { Module } from "@nestjs/common";
import { UserController } from "./interfaces/controllers";
import { UserUseCasesModule } from "./use-cases/user/user-use-cases.module";
import { ConfigModule } from "@nestjs/config";
import envConfig, { validateConfig } from "./common/config/env.config";
import { JobUseCasesModule } from "./use-cases/job/job-use-cases.module";
import { JobController } from "./interfaces/controllers/job.controller";

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
  ],
  controllers: [UserController, JobController],
  providers: [],
})
export class AppModule {}
