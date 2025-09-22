import { Injectable } from "@nestjs/common";
import { IDataServices } from "../../core/abstracts";
import { Job } from "@/core/entities/job.entity";
import { Company } from "@/core/entities/company.entity";

@Injectable()
export class JobUseCases {
  constructor(private readonly dataServices: IDataServices) {}

  async getAllJobs(limit?: number): Promise<{ job: Job; company: Company }[]> {
    return this.dataServices.jobs.getAllJobs(limit);
  }
}
