import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class UserSkillDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  skillId: string;
}

export class CreateUserSkillDto {
  @ApiProperty()
  @IsString()
  skillId: string;
}

export class UpdateUserSkillDto {
  @ApiProperty()
  @IsString()
  skillId: string;
}
