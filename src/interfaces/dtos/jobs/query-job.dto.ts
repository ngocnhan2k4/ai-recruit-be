import { ApiProperty } from "@nestjs/swagger";
import { GeneralQueryDto } from "../common/query";
import { CompanyDto } from "../companies/company.dto";
import { JobDto } from "./job.dto";

export class QueryJobDto extends GeneralQueryDto {}

export class JobResponse {
  @ApiProperty({ type: JobDto })
  job: JobDto;

  @ApiProperty({ type: CompanyDto })
  company: CompanyDto;

  @ApiProperty({ type: [String] })
  skills: string[];
}
