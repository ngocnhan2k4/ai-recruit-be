import { Injectable } from "@nestjs/common";
import { JobRaw } from "@/core/entities/jobRaw.entity";
import { CompanyRaw } from "@/core/entities/companyRaw.entity";
import { IDataServices } from "@/core";
import { ApiResponse } from "@/interfaces/dtos";

@Injectable()
export class JobRawUseCases {
  constructor(private readonly dataServices: IDataServices) {}

  async getAllJobs(
    limit?: number,
  ): Promise<ApiResponse<{ job: JobRaw; company: CompanyRaw }[]>> {
    return this.dataServices.jobRaws.getAllJobs(limit);
  }
}
