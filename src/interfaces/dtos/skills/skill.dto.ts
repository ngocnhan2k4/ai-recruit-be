import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class SkillDto {
  @ApiProperty({ type: "string", format: "uuid" })
  id: string;

  @ApiProperty({ type: "string" })
  name: string;
}

export class CreateSkillDto {
  @ApiProperty({ type: "string" })
  @IsString()
  name: string;
}
