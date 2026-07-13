import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CurrentModuleResourceDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  title: string;
}

export class CurrentSkillOptionDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  optionName: string;
}

export class ChatWithRoadmapDto {
  @ApiProperty({ example: "Thêm kỹ năng React vào lộ trình giúp mình" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  message: string;

  @ApiPropertyOptional({
    description: "ID of the skill the user is currently viewing",
  })
  @IsOptional()
  @IsString()
  currentSkillId?: string;

  @ApiPropertyOptional({
    description: "Name of the skill the user is currently viewing",
  })
  @IsOptional()
  @IsString()
  currentSkillName?: string;

  @ApiPropertyOptional({
    description: "Resources in the currently viewed module",
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CurrentModuleResourceDto)
  currentModuleResources?: CurrentModuleResourceDto[];

  @ApiPropertyOptional({ description: "Options of the currently viewed skill" })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CurrentSkillOptionDto)
  currentSkillOptions?: CurrentSkillOptionDto[];

  @ApiPropertyOptional({
    description: "Modules in the currently viewed subpath",
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CurrentModuleResourceDto)
  currentModules?: CurrentModuleResourceDto[];
}
