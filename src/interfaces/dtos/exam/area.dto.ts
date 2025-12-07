import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { IsString, IsNotEmpty, IsOptional, MaxLength } from "class-validator";

export class CreateAreaDto {
  @ApiProperty({ example: "Programming" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    example: "Programming and software development skills",
  })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateAreaDto extends PartialType(CreateAreaDto) {}
