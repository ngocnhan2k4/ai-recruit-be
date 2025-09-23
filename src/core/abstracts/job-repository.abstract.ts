import { PostgresGenericRepository } from "@/frameworks/data-services/postgres/postgres-generic-repository";
import { JobRaw } from "../entities/jobRaw.entity";
import { jobRaws } from "@/frameworks/data-services/postgres/model";
import { CompanyRaw } from "../entities/companyRaw.entity";

export abstract class PostgresJobRawRepository extends PostgresGenericRepository<
  JobRaw,
  typeof jobRaws
> {
  constructor() {
    super(jobRaws);
  }

  abstract getAllJobs(
    limit?: number,
  ): Promise<{ job: JobRaw; company: CompanyRaw }[]>;
}
