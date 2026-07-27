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
  IUserTestRepository,
  IUserAnswerRepository,
  IWeeklyProgressRepository,
  ISubscriptionRepository,
  IFeatureRepository,
  IUserFeatureUsageRepository,
  ITaskRepository,
  IUserActionRepository,
  ICommentRepository,
  IJobCopilotDraftRepository,
  ICandidateBriefRepository,
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
import { UserTestRepository } from "./repositories/user-test.repository";
import { UserAnswerRepository } from "./repositories/user-answer.repository";
import { WeeklyProgressRepository } from "./repositories/weekly-progress.repository";
import { SubscriptionRepository } from "./repositories/subscription.repository";
import { FeatureRepository } from "./repositories/feature.repository";
import { UserFeatureUsageRepository } from "./repositories/user-feature-usage.repository";
import { IUserSubscriptionRepository } from "@/core/abstracts/repositories/user-subscription-repository.abstract";
import { UserSubscriptionRepository } from "./repositories/user-subscription.repository";
import { ISkillsSynonymsRepository } from "@/core/abstracts/repositories/skills-synonyms-repository.abstract";
import { SkillsSynonymsRepository } from "./repositories/skills-synonyms.repository";
import { TaskRepository } from "./repositories/task.repository";
import { IBlogRepository } from "@/core/abstracts/repositories/blog-repository.abstract";
import { BlogRepository } from "./repositories/blog.repository";
import { UserActionRepository } from "./repositories/user-action.repository";
import { CommentRepository } from "./repositories/comment.repository";
import { JobCopilotDraftRepository } from "./repositories/job-copilot-draft.repository";
import { CandidateBriefRepository } from "./repositories/candidate-brief.repository";
import { SkillNoteRepository } from "./repositories/skill-note.repository";
import { ISkillNoteRepository } from "@/core/abstracts";
import { RoadmapChatMessageRepository } from "./repositories/roadmap-chat-message.repository";
import { IRoadmapChatMessageRepository } from "@/core/abstracts/repositories/roadmap-chat-message-repository.abstract";
import {
  ISubpathRepository,
  IOptionResourceCompletionRepository,
  ISubpathModuleQuizResultRepository,
} from "@/core/abstracts";
import {
  SubpathRepository,
  OptionResourceCompletionRepository,
  SubpathModuleQuizResultRepository,
} from "./repositories/subpath.repository";
import { RedisModule } from "@/frameworks/redis/redis.module";
import { createLoggerQuery, retry } from "@/common/utils";

@Global()
@Module({
  imports: [RedisModule],
  providers: [
    {
      provide: "DRIZZLE",
      useFactory: async (configService: ConfigService): Promise<DBDrizzle> => {
        const logger = new Logger("PostgresDataServicesModule");
        try {
          const poolMax = configService.get<number>("DATABASE_POOL_MAX") ?? 10;
          const poolMin = configService.get<number>("DATABASE_POOL_MIN") ?? 2;
          const connectionTimeoutMillis =
            configService.get<number>("DATABASE_POOL_CONNECTION_TIMEOUT_MS") ??
            10000;

          const pool = new Pool({
            connectionString: configService.get<string>("DATABASE_URL"),
            ssl: { rejectUnauthorized: false },
            // Keep max modest so multiple replicas/workers don't exhaust DO slots
            max: poolMax,
            min: poolMin,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis,
          });

          (pool as any).query = createLoggerQuery(pool, { logger });

          let attempt = 0;
          await retry(
            async () => {
              attempt++;
              try {
                await pool.query("SELECT 1");
              } catch (err) {
                logger.error(
                  `Database connection attempt ${attempt} failed:`,
                  err,
                );
                throw err;
              }
            },
            { retries: 3, interval: 1000 },
          );
          logger.log(
            `Database connection established successfully (attempt ${attempt}, pool max=${poolMax}, min=${poolMin}, timeout=${connectionTimeoutMillis}ms).`,
          );

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
      provide: IJobCopilotDraftRepository,
      useClass: JobCopilotDraftRepository,
    },
    {
      provide: ICandidateBriefRepository,
      useClass: CandidateBriefRepository,
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
      provide: ISkillsSynonymsRepository,
      useClass: SkillsSynonymsRepository,
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
      provide: IUserTestRepository,
      useClass: UserTestRepository,
    },
    {
      provide: IUserAnswerRepository,
      useClass: UserAnswerRepository,
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
      provide: ITaskRepository,
      useClass: TaskRepository,
    },
    {
      provide: IUserSubscriptionRepository,
      useClass: UserSubscriptionRepository,
    },
    {
      provide: IUserFeatureUsageRepository,
      useClass: UserFeatureUsageRepository,
    },
    {
      provide: IBlogRepository,
      useClass: BlogRepository,
    },
    {
      provide: IUserActionRepository,
      useClass: UserActionRepository,
    },
    {
      provide: ICommentRepository,
      useClass: CommentRepository,
    },
    {
      provide: ISkillNoteRepository,
      useClass: SkillNoteRepository,
    },
    {
      provide: ISubpathRepository,
      useClass: SubpathRepository,
    },
    {
      provide: IOptionResourceCompletionRepository,
      useClass: OptionResourceCompletionRepository,
    },
    {
      provide: ISubpathModuleQuizResultRepository,
      useClass: SubpathModuleQuizResultRepository,
    },
    {
      provide: IRoadmapChatMessageRepository,
      useClass: RoadmapChatMessageRepository,
    },
  ],
  exports: [
    "DRIZZLE",
    IAuthRepository,
    ICategoryRepository,
    ICasbinRepository,
    ICvRepository,
    IJobRepository,
    IJobCopilotDraftRepository,
    ICandidateBriefRepository,
    IProvinceRepository,
    ISkillRepository,
    ISkillsSynonymsRepository,
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
    IUserTestRepository,
    IUserAnswerRepository,
    IAiCvRepository,
    IWeeklyProgressRepository,
    ISubscriptionRepository,
    IFeatureRepository,
    IUserFeatureUsageRepository,
    IUserSubscriptionRepository,
    IUserFeatureUsageRepository,
    ITaskRepository,
    IBlogRepository,
    IUserActionRepository,
    ICommentRepository,
    ISkillNoteRepository,
    ISubpathRepository,
    IOptionResourceCompletionRepository,
    ISubpathModuleQuizResultRepository,
    IRoadmapChatMessageRepository,
  ],
})
export class PostgresDataServicesModule {}
