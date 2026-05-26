import { SentryModule } from "@sentry/nestjs/setup";
import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { PrometheusModule } from "@willsoto/nestjs-prometheus";
import {
  HTTP_REQUESTS_TOTAL,
  HTTP_REQUEST_DURATION_SECONDS,
} from "@/common/config/prometheus.config";
import { PrometheusMetricsInterceptor } from "@/common/interceptors";
import {
  UserController,
  AuthController,
  UploadController,
  HealthController,
  CategoryController,
  JobController,
  ProvinceController,
  CvController,
  UniversityController,
  AdminUserController,
  // MyOrganizationController,
  NotificationController,
  AdminNotificationController,
  // CompanyController,
  // CompanyAdminController,
  OrganizationAdminController,
  OrganizationController,
  OrganizationMemberController,
  OrganizationInvitationController,
  LearningPathController,
  AdminJobSyncController,
  JobMatchingController,
  BlogController,
  AdminBlogController,
  CommentController,
  TaskAdminController,
} from "./interfaces/controllers";
import { CasbinController } from "./interfaces/controllers/casbin/casbin.controller";
import { FeedbackController } from "./interfaces/controllers/feedback/feedback.controller";
import { AdminExamController } from "./interfaces/controllers/exam/admin-exam.controller";
import { ExamController } from "./interfaces/controllers/exam/exam.controller";
import { UserUseCasesModule } from "./use-cases/user/user-use-cases.module";
import { ScheduleModule } from "@nestjs/schedule";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Environment, validateConfig } from "./common/config/env.config";
import { AuthUseCasesModule } from "./use-cases/auth/auth-use-cases.module";
import { CasbinModule } from "./frameworks/auth-services/casbin/casbin.module";
import { JwtStrategy } from "./frameworks/auth-services/strategies/jwt.strategy";
import { CategoryUseCasesModule } from "./use-cases/category/category-use-cases.module";
import { JobUseCasesModule } from "./use-cases/job/job-use-cases.module";
import { RedisModule } from "./frameworks/redis/redis.module";
import { CloudinaryModule } from "./frameworks/storage/cloudinary/cloudinary.module";
import { StorageModule } from "./use-cases/storage/storage.module";
import { CacheModule } from "@nestjs/cache-manager";
import { createKeyv } from "@keyv/redis";
import { TerminusModule } from "@nestjs/terminus";
import { HttpModule } from "@nestjs/axios";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { HttpExceptionFilter } from "./common/middlewares/http-exception.config";
import { LoggingInterceptor } from "@/common/interceptors";
import { ILoggerServices } from "@/core/abstracts/logger-services.abstract";
import { AppConfigProps } from "@/common/config";
import { LoggerServiceModule } from "@/frameworks/logger-services/logger.module";
import { ProvinceUseCasesModule } from "@/use-cases/province/province-use-cases.module";
import { CvUseCasesModule } from "@/use-cases/cv/cv-use-cases.module";
import { SkillController } from "@/interfaces/controllers/skill/skill.controller";
import { AdminSkillController } from "@/interfaces/controllers/skill/admin-skill.controller";
import { SkillUseCasesModule } from "@/use-cases/skill/skill-use-cases.module";
import { UniversityUseCasesModule } from "@/use-cases/university/university-use-cases.module";
import { NotificationUseCasesModule } from "@/use-cases/notification/notification-use-cases.module";
import { WebSocketModule } from "@/frameworks/websocket/websocket.module";
import { OrganizationUseCasesModule } from "@/use-cases/organization/organization-use-cases.module";
import { CasbinUseCasesModule } from "@/use-cases/casbin/casbin-use-cases.module";
import { JobAdminController } from "@/interfaces/controllers/job/admin-job.controller";
import { OrganizationJobController } from "@/interfaces/controllers/job/organization-job-controller";
import { OrganizationMemberUseCasesModule } from "@/use-cases/organization-member/organization-member-use-case.module";
import { OrganizationInvitationUseCaseModule } from "@/use-cases/organization-invitation/organization-intivation-use-case.module";
import { FeedbackUseCasesModule } from "@/use-cases/feedback/feedback.module";
import { FeedbackAdminController } from "@/interfaces/controllers/feedback/feedback-admin.controller";
import { EmailModule } from "@/frameworks/email-services/email.module";
import { LearningPathUseCasesModule } from "./use-cases/learning-path/learning-path-use-cases.module";
import { ExamUseCasesModule } from "@/use-cases/exam/exam-use-cases.module";
import { JobMatchingUseCasesModule } from "@/use-cases/job-matching/job-matching.use-cases.module";
import { JobMatchingSchedulerModule } from "@/frameworks/schedulers/job-scheduler.module";
import { ElasticsearchModule } from "@/frameworks/data-services/elasticsearch/elasticsearch.module";
import { JobSyncUseCaseModule } from "@/use-cases/job-sync/job-sync.use-case.module";
import { CvSyncUseCaseModule } from "@/use-cases/cv-sync/cv-sync.use-case.module";
import { OtpModule } from "@/frameworks/otp-services/otp.module";
import { OtpStorageModule } from "./frameworks/otp-services/otp-storage-services/otp-storage.module";
import { AiCvController } from "./interfaces/controllers/ai-cv/ai-cv.controller";
import { AiCvUseCasesModule } from "./use-cases/ai-cv/ai-cv.use-cases.module";
import { RateLimitMiddleware } from "./common/middlewares";
import { AdminSubscriptionController } from "@/interfaces/controllers/subscription/admin-subscription.controller";
import { AdminFeatureController } from "@/interfaces/controllers/feature/admin-feature.controller";
import { SubscriptionUseCasesModule } from "@/use-cases/subscription/subscription-use-cases.module";
import { FeatureUseCasesModule } from "@/use-cases/feature/feature-use-cases.module";
import { SkillSynonymUseCasesModule } from "@/use-cases/skill-synonym/skill-synonym.use-cases.module";
import { SkillSynonymController } from "@/interfaces/controllers/skill-synonym/skill-synonym.controller";
import { DeploymentUseCasesModule } from "@/use-cases/deployment/deployment-use-cases.module";
import { AdminDeploymentController } from "@/interfaces/controllers/deployment/admin-deployment.controller";
import { AdminCvSyncController } from "@/interfaces/controllers/cv-sync/admin-cv-sync.controller";
import { BlogUseCasesModule } from "@/use-cases/blog/blog-use-cases.module";
import { CommentUseCasesModule } from "@/use-cases/comment/comment.use-case.module";
import { TaskUseCasesModule } from "@/use-cases/task/task.module";

@Module({
  imports: [
    // SentryModule must be the first import so Sentry can instrument all other modules
    SentryModule.forRoot(),
    PrometheusModule.register({
      defaultMetrics: { enabled: true },
      path: "/metrics",
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", ".env.development", ".env.production"],
      // load: [envConfig],
      validate: validateConfig,
    }),
    ScheduleModule.forRoot(),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>("REDIS_HOST");
        const port = configService.get<string>("REDIS_PORT");
        const password = configService.get<string>("REDIS_PASSWORD")
          ? `:${configService.get<string>("REDIS_PASSWORD")}@`
          : "";
        const db = configService.get<number>("REDIS_DB");

        const redisUrl = `redis://${password}${host}:${port}/${db}`;
        return {
          stores: [createKeyv(redisUrl)],
        };
      },
    }),
    RedisModule,
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
    CvUseCasesModule,
    SkillUseCasesModule,
    UniversityUseCasesModule,
    NotificationUseCasesModule,
    OrganizationUseCasesModule,
    OrganizationMemberUseCasesModule,
    OrganizationInvitationUseCaseModule,
    CasbinUseCasesModule,
    WebSocketModule,
    FeedbackUseCasesModule,
    EmailModule,
    LearningPathUseCasesModule,
    ExamUseCasesModule,
    JobMatchingUseCasesModule,
    JobMatchingSchedulerModule,
    ElasticsearchModule,
    JobSyncUseCaseModule,
    CvSyncUseCaseModule,
    OtpModule,
    OtpStorageModule,
    AiCvUseCasesModule,
    SubscriptionUseCasesModule,
    FeatureUseCasesModule,
    SkillSynonymUseCasesModule,
    DeploymentUseCasesModule,
    BlogUseCasesModule,
    CommentUseCasesModule,
    TaskUseCasesModule,
  ],
  controllers: [
    UserController,
    AuthController,
    JobController,
    OrganizationJobController,
    JobAdminController,
    JobMatchingController,
    CategoryController,
    UploadController,
    HealthController,
    ProvinceController,
    CvController,
    SkillController,
    AdminSkillController,
    UniversityController,
    CasbinController,
    NotificationController,
    AdminNotificationController,
    OrganizationAdminController,
    OrganizationController,
    OrganizationMemberController,
    OrganizationInvitationController,
    AdminUserController,
    FeedbackController,
    FeedbackAdminController,
    LearningPathController,
    AdminJobSyncController,
    AdminCvSyncController,
    AdminExamController,
    ExamController,
    AiCvController,
    AdminSubscriptionController,
    AdminFeatureController,
    SkillSynonymController,
    AdminDeploymentController,
    BlogController,
    AdminBlogController,
    CommentController,
    TaskAdminController,
  ],
  providers: [
    JwtStrategy,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
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
      inject: [ConfigService, ILoggerServices],
    },
    RateLimitMiddleware,
    HTTP_REQUESTS_TOTAL,
    HTTP_REQUEST_DURATION_SECONDS,
    {
      provide: APP_INTERCEPTOR,
      useClass: PrometheusMetricsInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RateLimitMiddleware)
      .exclude("/health", "users/me", "auth/refresh")
      .forRoutes("*");
  }
}
