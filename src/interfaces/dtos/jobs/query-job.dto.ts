import { ApiProperty } from "@nestjs/swagger";
import { GeneralQueryDto } from "../common/query";
import { CompanyDto } from "../companies/company.dto";
import { JobDto } from "./job.dto";
import { Skill } from "@/core";
import { SkillDto } from "../skills/skill.dto";
import { ProvinceDto } from "../provinces/province.dto";
import { Province } from "@/core/entities/province.entity";

export class QueryJobDto extends GeneralQueryDto {}

export class JobResponse {
  @ApiProperty({ type: JobDto })
  job: JobDto;

  @ApiProperty({ type: [ProvinceDto] })
  provinces: Province[];

  @ApiProperty({ type: CompanyDto })
  company: CompanyDto;

  @ApiProperty({ type: [SkillDto] })
  skills: Skill[];
}
