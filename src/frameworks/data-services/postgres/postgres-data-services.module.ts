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
  ],
})
export class PostgresDataServicesModule {}
