import { Injectable } from "@nestjs/common";
import { IDataServices } from "../../core/abstracts";
import { StatisticsJobFilter } from "@/core/entities/job.entity";
import { ApiResponse, JobResponse } from "@/interfaces/dtos";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants/response";
import { omit } from "lodash";
import {
  StatisticsJobFilterDto,
  StatisticsJobResponse,
} from "@/interfaces/dtos";

@Injectable()
export class JobUseCases {
  constructor(private readonly dataServices: IDataServices) { }

  async getAllJobs(
    limit?: number,
    offset?: number,
    keyword?: string,
  ): Promise<ApiResponse<JobResponse[]>> {
    const result = await this.dataServices.jobs.getAllJobs(
      limit,
      offset,
      keyword,
    );
    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: result,
    };
  }

  async getStatisticsJobs(
    filter: StatisticsJobFilterDto,
  ): Promise<ApiResponse<StatisticsJobResponse>> {
    const [
      frequentlyJobs,
      openJobCount,
      salaryStatistics,
      totalJobs,
      totalJobByCategoryId,
    ] = await Promise.all([
      this.dataServices.jobs.getFrequentlyJobs(filter),
      this.dataServices.jobs.count({
        ...filter,
        isOpen: true,
      }),
      this.dataServices.jobs.getSalaryStatisticsByExperience(filter),
      this.dataServices.jobs.count({
        ...(omit(filter, ["categoryId"]) as StatisticsJobFilter),
      }),
      this.dataServices.jobs.count({
        ...filter,
      }),
    ]);

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: {
        frequentlyJobs,
        openJobCount,
        salaryStatistics,
        totalJobs,
        totalJobByCategoryId,
      },
    };
  }
}
