import { IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { CompanyDto } from "../companies/company.dto";

export class UserExperienceDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ type: () => CompanyDto })
  company: Pick<CompanyDto, "id" | "name" | "logoUrl" | "address">;

  @ApiProperty()
  jobTitle: string;

  @ApiProperty()
  position: string;

  @ApiProperty()
  startDate: string;

  @ApiProperty({ type: String, nullable: true })
  endDate: string | null;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  // @ApiProperty()
  // createdAt: Date;

  // @ApiProperty({ required: false })
  // updatedAt: Date;

  // @ApiProperty({ required: false })
  // deletedAt: Date;
}

export class CreateUserExperienceRequestDto {
  @ApiProperty()
  @IsString()
  companyId: string;

  @ApiProperty()
  @IsString()
  jobTitle: string;

  @ApiProperty()
  @IsString()
  position: string;

  @ApiProperty()
  @IsString()
  startDate: Date;

  @ApiProperty()
  @IsString()
  endDate: Date;

  @ApiProperty()
  @IsString()
  description: string;
}

export class UpdateUserExperienceRequestDto {
  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsString()
  startDate: Date;

  @ApiProperty()
  @IsString()
  endDate: Date;

  @ApiProperty()
  @IsString()
  position: string;

  @ApiProperty()
  @IsString()
  jobTitle: string;

  @ApiProperty()
  @IsString()
  companyId: string;
}
