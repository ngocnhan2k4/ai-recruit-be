import { IsNotEmpty, IsString, MinLength, MaxLength } from "class-validator";
import { GeneralQueryDto } from "../common/query";
import { ApiProperty } from "@nestjs/swagger";

export class CompanyDto {
  @ApiProperty({ type: "string", format: "uuid" })
  id: string;

  @ApiProperty({ type: "string" })
  name: string;

  @ApiProperty({ type: "string", nullable: true })
  logoUrl: string | null;

  @ApiProperty({ type: "string", nullable: true })
  description: string | null;

  @ApiProperty({ type: "array", items: { type: "string" }, nullable: true })
  address: string[] | null;

  @ApiProperty({ type: "number" })
  employeesMin: number | null;

  @ApiProperty({ type: "number" })
  employeesMax: number | null;

  @ApiProperty({ type: "string", nullable: true })
  websiteUrl: string | null;
}

export class GetCompaniesQueryDto extends GeneralQueryDto {}

export class CreateCompanyDto {
  @ApiProperty({
    description: "Company name",
    type: "string",
    example: "Tech Company Ltd",
    minLength: 2,
    maxLength: 255,
  })
  @IsNotEmpty({ message: "Company name is required" })
  @IsString({ message: "Company name must be a string" })
  @MinLength(2, { message: "Company name must be at least 2 characters long" })
  @MaxLength(255, { message: "Company name must not exceed 255 characters" })
  name: string;
}
