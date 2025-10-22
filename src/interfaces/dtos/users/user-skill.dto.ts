import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class UserSkillDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}

export class CreateUserSkillRequestDto {
  @ApiProperty()
  @IsString()
  skillId: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  companyId: string;
}

export class DeleteUserSkillResponseDto {
  @ApiProperty()
  skillId: string;

  @ApiProperty({ nullable: true })
  organizationId: string | null;
}
