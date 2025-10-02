import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class UserSkillDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  skillId: string;
}

export class CreateUserSkillRequestDto {
  @ApiProperty()
  @IsString()
  skillId: string;
}
