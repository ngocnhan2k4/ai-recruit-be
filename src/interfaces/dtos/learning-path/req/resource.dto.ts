import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class AddResourceDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  url: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsBoolean()
  isFree?: boolean;
}

export class AddResourcesToSkillDto {
  @ApiProperty({ type: [AddResourceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddResourceDto)
  resources: AddResourceDto[];
}
