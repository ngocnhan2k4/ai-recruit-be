import { Injectable } from "@nestjs/common";
import { JobRaw } from "@/core/entities/jobRaw.entity";
import { CompanyRaw } from "@/core/entities/companyRaw.entity";
import { IDataServices } from "@/core";
import { ApiResponse } from "@/interfaces/dtos";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants/constants";

@Injectable()
export class JobRawUseCases {
  constructor(private readonly dataServices: IDataServices) {}

  async getAllJobs(
    limit?: number,
  ): Promise<ApiResponse<{ job: JobRaw; company: CompanyRaw }[]>> {
    const result = await this.dataServices.jobRaws.getAllJobs(limit);
    return new ApiResponse({
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: result,
    });
  }
}
