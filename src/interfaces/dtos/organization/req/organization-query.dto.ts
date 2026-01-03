import { IsArray, IsNumber, IsOptional, IsString } from "class-validator";
import { GeneralQueryDto } from "../../common/query";
import { Transform } from "class-transformer";

export class OrganizationQueryDto extends GeneralQueryDto {
  @IsOptional()
  @IsNumber()
  employeeMin?: number;

  @IsOptional()
  @IsNumber()
  employeeMax?: number;

  @IsOptional()
  @Transform(({ value }) =>
    value === "true" ? true : value === "false" ? false : undefined,
  )
  verified?: boolean;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : undefined,
  )
  provinceIds?: string[];

  @IsOptional()
  @IsString()
  organizationType?: string;
}
