import { Injectable } from "@nestjs/common";
import { IDataServices } from "../../core/abstracts";
import { JobFactoryService } from "./job-factory.service";
import { Job } from "@/core/entities/job.entity";
import { Company } from "@/core/entities/company.entity";
import { ApiResponse } from "@/interfaces/dtos";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants/constants";

@Injectable()
export class JobUseCases {
  constructor(
    private readonly dataServices: IDataServices,
    private readonly jobFactoryService: JobFactoryService,
  ) {}

  async getAllJobs(
    limit?: number,
    offset?: number,
    keyword?: string,
  ): Promise<ApiResponse<{ job: Job; company: Company }[]>> {
    const result = await this.dataServices.jobs.getAllJobs(
      limit,
      offset,
      keyword,
    );
    return new ApiResponse({
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: result,
    });
  }
}
