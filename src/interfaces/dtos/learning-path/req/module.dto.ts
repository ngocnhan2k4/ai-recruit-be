import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  MaxLength,
} from "class-validator";

export class AddModuleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  duration?: string;

  @IsOptional()
  @IsArray()
  concepts?: string[];
}
