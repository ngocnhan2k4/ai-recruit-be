import { Module } from "@nestjs/common";
import {
  UserController,
  AuthController,
  UploadController,
  HealthController,
  CategoryController,
  CompanyController,
  JobController,
  ProvinceController,
  CvController,
  UniversityController,
  UserOrganizationController,
  MyOrganizationController,
} from "./interfaces/controllers";
import { UserUseCasesModule } from "./use-cases/user/user-use-cases.module";
import { ScheduleModule } from "@nestjs/schedule";
import { ConfigModule, ConfigService } from "@nestjs/config";
import envConfig, {
  Environment,
  validateConfig,
} from "./common/config/env.config";
import { AuthUseCasesModule } from "./use-cases/auth/auth-use-cases.module";
import { CasbinModule } from "./frameworks/auth-services/casbin/casbin.module";
import { JwtStrategy } from "./frameworks/auth-services/strategies/jwt.strategy";
import { CategoryUseCasesModule } from "./use-cases/category/category-use-cases.module";
import { JobUseCasesModule } from "./use-cases/job/job-use-cases.module";
//import { RedisModule } from "./frameworks/redis/redis.module";
import { CloudinaryModule } from "./frameworks/storage/cloudinary/cloudinary.module";
import { StorageModule } from "./use-cases/storage/storage.module";
import { TerminusModule } from "@nestjs/terminus";
import { HttpModule } from "@nestjs/axios";
import { APP_FILTER } from "@nestjs/core";
import { HttpExceptionFilter } from "./common/middlewares/http-exception.config";
import { ILoggerServices } from "./core/abstracts/logger-services.abstract";
import { AppConfigProps } from "./common/config/app.config";
import { LoggerServiceModule } from "./frameworks/logger-services/logger.module";
import { ProvinceUseCasesModule } from "./use-cases/province/province-use-cases.module";
import { CompanyUseCasesModule } from "./use-cases/company/company-use-cases.module";
import { CvUseCasesModule } from "./use-cases/cv/cv-use-cases.module";
import { SkillController } from "./interfaces/controllers/skill.controller";
import { SkillUseCasesModule } from "./use-cases/skill/skill-use-cases.module";
import { UniversityUseCasesModule } from "./use-cases/university/university-use-cases.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", ".env.development", ".env.production"],
      load: [envConfig],
      validate: validateConfig,
    }),
    ScheduleModule.forRoot(),
    //RedisModule,
    UserUseCasesModule,
    JobUseCasesModule,
    AuthUseCasesModule,
    CasbinModule,
    CategoryUseCasesModule,
    CloudinaryModule,
    StorageModule,
    TerminusModule,
    HttpModule,
    LoggerServiceModule,
    ProvinceUseCasesModule,
    CompanyUseCasesModule,
    CvUseCasesModule,
    SkillUseCasesModule,
    UniversityUseCasesModule,
  ],
  controllers: [
    UserController,
    AuthController,
    JobController,
    CategoryController,
    CompanyController,
    UploadController,
    HealthController,
    ProvinceController,
    CvController,
    SkillController,
    UniversityController,
    UserOrganizationController,
    MyOrganizationController,
  ],
  providers: [
    JwtStrategy,
    {
      provide: APP_FILTER,
      useFactory: (
        configService: ConfigService,
        loggerService: ILoggerServices,
      ) => {
        const appConfigs = {
          name: configService.get<string>("NAME")!,
          port: configService.get<number>("PORT")!,
          globalPrefix: configService.get<string>("GLOBAL_PREFIX")!,
          nodeEnv: configService.get<string>("NODE_ENV")! as Environment,
        } as AppConfigProps;
        return new HttpExceptionFilter(appConfigs, loggerService);
      },
      inject: [ConfigService, "ILoggerServices"],
    },
  ],
})
export class AppModule {}
