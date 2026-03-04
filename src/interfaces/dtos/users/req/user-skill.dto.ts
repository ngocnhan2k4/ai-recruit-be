import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class CreateUserSkillRequestDto {
  @ApiProperty()
  @IsString()
  skillId: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  companyId: string;
}
