import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { Logger } from "@nestjs/common";
import { DBDrizzle } from "@/frameworks/data-services/postgres/types";
import {
  IAuthRepository,
  ICategoryRepository,
  ICasbinRepository,
  ICompanyRepository,
  IJobRepository,
  ICvRepository,
  IProvinceRepository,
  ISkillRepository,
  IUserExperienceRepository,
  IUserRepository,
  IUserSkillRepository,
  IUserOnboardingRepository,
  INotificationRepository,
  IOrganizationRepository,
  IFeedbackRepository,
  ILearningRoadmapRepository,
  IRoadmapPhaseRepository,
  IRoadmapSkillRepository,
  IRoadmapSkillOptionRepository,
  IAreaRepository,
  IQuestionRepository,
  ILevelRepository,
  IUserTestRepository,
  IUserAnswerRepository,
  IImportLogRepository,
  IWeeklyProgressRepository,
  ISubscriptionRepository,
  IFeatureRepository,
  IUserFeatureUsageRepository,
} from "@/core";

import { AuthRepository } from "./repositories/auth.repository";
import { CategoryRepository } from "./repositories/category.repository";
import { CasbinRepository } from "./repositories/casbin.repository";
import { CompanyRepository } from "./repositories/company.repository";
import { CvRepository } from "./repositories/cv.repository";
import { JobRepository } from "./repositories/job.repository";
import { ProvinceRepository } from "./repositories/province.repository";
import { UserExperienceRepository } from "./repositories/user-experience.repository";
import { UserSkillRepository } from "./repositories/user-skill.repository";
import { UserRepository } from "./repositories/user.repository";
import { SkillRepository } from "./repositories/skill.repository";
import { UserOnboardingRepository } from "./repositories/user-onboarding.repository";
import { IOrganizationMembersRepository } from "@/core/abstracts/repositories/organization-members-repository.abstract";
import { OrganizationMembersRepository } from "./repositories/organization-members.repository";
import { NotificationRepository } from "./repositories/notification.repository";
import { OrganizationRepository } from "./repositories/organization.repository";
import { UserEducationRepository } from "./repositories/user-education.repository";
import { IUserEducationRepository } from "@/core/abstracts/repositories/user-education-repository.abstract";
import { ISchoolRepository } from "@/core/abstracts/repositories/school-repository.abstract";
import { SchoolRepository } from "./repositories/school.repository copy";
import { IOrganizationLocationRepository } from "@/core/abstracts/repositories/organization-location-repository.abstract";
import { OrganizationLocationRepository } from "./repositories/organization-location.repository";
import { IOrganizationMemberInvitationRepository } from "@/core/abstracts/repositories/organization-member-invitations-repository.abstract";
import { OrganizationMemberInvitationsRepository } from "./repositories/organization-member-invitation.repository";
import { FeedbackRepository } from "./repositories/feedback.repository";
import { LearningRoadmapRepository } from "./repositories/learning-roadmap.repository";
import { RoadmapPhaseRepository } from "./repositories/roadmap-phase.repository";
import { RoadmapSkillRepository } from "./repositories/roadmap-skill.repository";
import { RoadmapSkillOptionRepository } from "./repositories/roadmap-skill-option.repository";
import { IAiCvRepository } from "@/core/abstracts/repositories/ai-cv-repository.abstract";
import { AiCvRepository } from "./repositories/ai-cv.repository";
import { AreaRepository } from "./repositories/area.repository";
import { QuestionRepository } from "./repositories/question.repository";
import { LevelRepository } from "./repositories/level.repository";
import { UserTestRepository } from "./repositories/user-test.repository";
import { UserAnswerRepository } from "./repositories/user-answer.repository";
import { ImportLogRepository } from "./repositories/import-log.repository";
import { WeeklyProgressRepository } from "./repositories/weekly-progress.repository";
import { SubscriptionRepository } from "./repositories/subscription.repository";
import { FeatureRepository } from "./repositories/feature.repository";
import { UserFeatureUsageRepository } from "./repositories/user-feature-usage.repository";
import { IUserSubscriptionRepository } from "@/core/abstracts/repositories/user-subscription-repository.abstract";
import { UserSubscriptionRepository } from "./repositories/user-subscription.repository";
import { ISubscriptionFeatureRepository } from "@/core/abstracts/repositories/subscription-feature-repository.abstract";
import { SubscriptionFeatureRepository } from "./repositories/subscription-feature.repository";

@Global()
@Module({
  providers: [
    {
      provide: "DRIZZLE",
      useFactory: async (configService: ConfigService): Promise<DBDrizzle> => {
        const logger = new Logger("PostgresDataServicesModule");
        try {
          const pool = new Pool({
            connectionString: configService.get<string>("DATABASE_URL"),
            ssl:
              process.env.NODE_ENV === "production"
                ? { rejectUnauthorized: false }
                : false,
            max: 20, // Maximum number of connections in the pool
            min: 5, // Minimum number of connections in the pool
            idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
            connectionTimeoutMillis: 2000, // Return error after 2 seconds if connection could not be established
          });

          // Wrap pool để log SQL queries
          const maxRetries = 3;
          let attempt = 0;
          let connected = false;

          while (!connected && attempt < maxRetries) {
            attempt++;
            try {
              await pool.query("SELECT 1");
              connected = true;
              logger.log(
                `Database connection established successfully (attempt ${attempt}).`,
              );
            } catch (err) {
              logger.error(
                `Database connection attempt ${attempt} failed:`,
                err,
              );
              if (attempt < maxRetries) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
              } else {
                throw err; // hết retry thì throw
              }
            }
          }
          const db = drizzle(pool, {
            casing: "snake_case",
            // logger: true,
          }) as DBDrizzle;
          return db;
        } catch (err) {
          logger.error("Error setting up Drizzle ORM:", err);
          throw err;
        }
      },
      inject: [ConfigService],
    },
    {
      provide: IAuthRepository,
      useClass: AuthRepository,
    },
    {
      provide: ICategoryRepository,
      useClass: CategoryRepository,
    },
    {
      provide: ICasbinRepository,
      useClass: CasbinRepository,
    },
    {
      provide: ICompanyRepository,
      useClass: CompanyRepository,
    },
    {
      provide: ISchoolRepository,
      useClass: SchoolRepository,
    },
    {
      provide: IOrganizationLocationRepository,
      useClass: OrganizationLocationRepository,
    },
    {
      provide: IJobRepository,
      useClass: JobRepository,
    },
    {
      provide: IProvinceRepository,
      useClass: ProvinceRepository,
    },
    {
      provide: IUserExperienceRepository,
      useClass: UserExperienceRepository,
    },
    {
      provide: IUserSkillRepository,
      useClass: UserSkillRepository,
    },
    {
      provide: IUserRepository,
      useClass: UserRepository,
    },
    {
      provide: ICvRepository,
      useClass: CvRepository,
    },
    {
      provide: ISkillRepository,
      useClass: SkillRepository,
    },
    {
      provide: IUserOnboardingRepository,
      useClass: UserOnboardingRepository,
    },
    {
      provide: IOrganizationMembersRepository,
      useClass: OrganizationMembersRepository,
    },
    {
      provide: INotificationRepository,
      useClass: NotificationRepository,
    },
    {
      provide: IOrganizationRepository,
      useClass: OrganizationRepository,
    },
    {
      provide: IUserEducationRepository,
      useClass: UserEducationRepository,
    },
    {
      provide: IOrganizationMemberInvitationRepository,
      useClass: OrganizationMemberInvitationsRepository,
    },
    {
      provide: IFeedbackRepository,
      useClass: FeedbackRepository,
    },
    {
      provide: ILearningRoadmapRepository,
      useClass: LearningRoadmapRepository,
    },
    {
      provide: IRoadmapPhaseRepository,
      useClass: RoadmapPhaseRepository,
    },
    {
      provide: IRoadmapSkillRepository,
      useClass: RoadmapSkillRepository,
    },
    {
      provide: IRoadmapSkillOptionRepository,
      useClass: RoadmapSkillOptionRepository,
    },
    {
      provide: IAreaRepository,
      useClass: AreaRepository,
    },
    {
      provide: IQuestionRepository,
      useClass: QuestionRepository,
    },
    {
      provide: ILevelRepository,
      useClass: LevelRepository,
    },
    {
      provide: IUserTestRepository,
      useClass: UserTestRepository,
    },
    {
      provide: IUserAnswerRepository,
      useClass: UserAnswerRepository,
    },
    {
      provide: IImportLogRepository,
      useClass: ImportLogRepository,
    },
    {
      provide: IAiCvRepository,
      useClass: AiCvRepository,
    },
    {
      provide: IWeeklyProgressRepository,
      useClass: WeeklyProgressRepository,
    },
    {
      provide: ISubscriptionRepository,
      useClass: SubscriptionRepository,
    },
    {
      provide: IFeatureRepository,
      useClass: FeatureRepository,
    },
    {
      provide: IUserFeatureUsageRepository,
      useClass: UserFeatureUsageRepository,
    },
    {
      provide: IUserSubscriptionRepository,
      useClass: UserSubscriptionRepository,
    },
    {
      provide: ISubscriptionFeatureRepository,
      useClass: SubscriptionFeatureRepository,
    },
    {
      provide: IUserFeatureUsageRepository,
      useClass: UserFeatureUsageRepository,
    },
  ],
  exports: [
    "DRIZZLE",
    IAuthRepository,
    ICategoryRepository,
    ICasbinRepository,
    ICvRepository,
    IJobRepository,
    IProvinceRepository,
    ISkillRepository,
    IUserExperienceRepository,
    IUserSkillRepository,
    IUserRepository,
    IUserOnboardingRepository,
    INotificationRepository,
    IUserEducationRepository,
    IOrganizationRepository,
    ICompanyRepository,
    IOrganizationMembersRepository,
    ISchoolRepository,
    IOrganizationLocationRepository,
    IOrganizationMemberInvitationRepository,
    IFeedbackRepository,
    ILearningRoadmapRepository,
    IRoadmapPhaseRepository,
    IRoadmapSkillRepository,
    IRoadmapSkillOptionRepository,
    IAreaRepository,
    IQuestionRepository,
    ILevelRepository,
    IUserTestRepository,
    IUserAnswerRepository,
    IImportLogRepository,
    IAiCvRepository,
    IWeeklyProgressRepository,
    ISubscriptionRepository,
    IFeatureRepository,
    IUserFeatureUsageRepository,
    IUserSubscriptionRepository,
    ISubscriptionFeatureRepository,
    IUserFeatureUsageRepository,
  ],
})
export class PostgresDataServicesModule {}
