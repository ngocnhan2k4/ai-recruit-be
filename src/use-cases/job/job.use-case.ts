import { Injectable, Logger } from "@nestjs/common";
import { IJobRepository } from "../../core/abstracts";
import { StatisticsJobFilter, JobFilters } from "@/core/entities/job.entity";
import { ApiResponse } from "@/interfaces/dtos";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants/response";
import { omit } from "lodash";
import {
  StatisticsJobFilterRequestDto,
  StatisticsJobResponse,
} from "@/interfaces/dtos";
import { Skill, Job, Company, Province } from "@/core";

@Injectable()
export class JobUseCases {
  private readonly logger = new Logger(JobUseCases.name);
  constructor(private readonly jobRepository: IJobRepository) {}

  async getAllJobs(
    limit?: number,
    cursor?: string,
    filters?: JobFilters,
  ): Promise<
    ApiResponse<{
      jobData: {
        job: Job;
        provinces: Province[];
        company: Company;
        skills: Skill[];
      }[];
      nextCursor?: string;
      hasNextPage: boolean;
    }>
  > {
    console.log(filters);
    const result = await this.jobRepository.getAllJobs(limit, cursor, filters);
    this.logger.log(`Fetched ${result.data.length} jobs`);
    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: {
        jobData: result.data,
        nextCursor: result.nextCursor,
        hasNextPage: result.hasNextPage,
      },
    };
  }

  async getStatisticsJobs(
    filter: StatisticsJobFilterRequestDto,
  ): Promise<ApiResponse<StatisticsJobResponse>> {
    const [
      frequentlyJobs,
      openJobCount,
      salaryStatistics,
      totalJobs,
      totalJobByCategoryId,
    ] = await Promise.all([
      this.jobRepository.getFrequentlyJobs(filter),
      this.jobRepository.count({
        ...filter,
        isOpen: true,
      }),
      this.jobRepository.getSalaryStatisticsByExperience(filter),
      this.jobRepository.count({
        ...(omit(filter, ["categoryId"]) as StatisticsJobFilter),
      }),
      this.jobRepository.count({
        ...filter,
      }),
    ]);

    this.logger.log(`Fetched statistics jobs`);
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
