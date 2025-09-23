import { Injectable } from "@nestjs/common";
import { IDataServices } from "../../core/abstracts";
import { JobRaw } from "@/core/entities/jobRaw.entity";
import { db } from "@/frameworks/data-services/postgres/db";
import { eq, getTableColumns } from "drizzle-orm";
import {
  companyRaws,
  jobRaws,
} from "@/frameworks/data-services/postgres/model";
import { CompanyRaw } from "@/core/entities/companyRaw.entity";

@Injectable()
export class JobRawUseCases {
  constructor(private readonly dataServices: IDataServices) {}

  async getAllJobs(
    limit = 50,
  ): Promise<{ job: JobRaw; company: CompanyRaw }[]> {
    const { id: _jobId, ...restJob } = getTableColumns(jobRaws);
    const { id: _companyId, ...restCompany } = getTableColumns(companyRaws);

    const result = db
      .select({
        job: { ...restJob },
        company: { ...restCompany },
      })
      .from(jobRaws)
      .innerJoin(companyRaws, eq(jobRaws.company_id, companyRaws.id))
      .limit(limit) as any as Promise<{ job: JobRaw; company: CompanyRaw }[]>;

    return result;
  }
}
