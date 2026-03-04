import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";
import { GeneralQueryDto } from "../../common/query";

export class CreateSkillDto {
  @ApiProperty({ type: "string", isArray: true })
  @IsString({ each: true })
  name: string[];
}

export class GetSkillsQueryDto extends GeneralQueryDto {}
