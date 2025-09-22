import { PostgresGenericRepository } from "@/frameworks/data-services/postgres/postgres-generic-repository";
import { Job } from "../entities/job.entity";
import {
  companyRaws,
  jobRaws,
} from "@/frameworks/data-services/postgres/model";
import { db } from "@/frameworks/data-services/postgres/db";
import { eq, getTableColumns } from "drizzle-orm";
import { Company } from "../entities/company.entity";

export class PostgresJobRawRepository extends PostgresGenericRepository<
  Job,
  typeof jobRaws
> {
  constructor() {
    super(jobRaws);
  }

  async getAllJobs(limit = 50): Promise<{ job: Job; company: Company }[]> {
    const { id: _jobId, ...restJob } = getTableColumns(jobRaws);
    const { id: _companyId, ...restCompany } = getTableColumns(companyRaws);

    const result = db
      .select({
        job: { ...restJob },
        company: { ...restCompany },
      })
      .from(jobRaws)
      .innerJoin(companyRaws, eq(jobRaws.company_id, companyRaws.id))
      .limit(limit) as any as Promise<{ job: Job; company: Company }[]>;

    return result;
  }
}
