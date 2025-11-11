import { IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { EducationLevelEnum } from "src/core/entities/enum.entity";
import { UserEducation } from "@/core";

export class UserEducationResponseDto {
  @ApiProperty()
  schoolId: string;

  @ApiProperty()
  schoolName: string;

  @ApiProperty()
  startDate: string;

  @ApiProperty()
  endDate: string | null;

  @ApiProperty()
  description: string | null;

  @ApiProperty()
  educationLevel: EducationLevelEnum | null;

  @ApiProperty()
  major: string | null;

  @ApiProperty()
  gpa: string | null;

  public static from(
    entity: UserEducation,
    schoolMap: Record<string, string>,
  ): UserEducationResponseDto {
    const dto = new UserEducationResponseDto();

    dto.schoolId = entity.schoolId;
    dto.schoolName = schoolMap[entity.schoolId];
    dto.startDate = entity.startDate;
    dto.endDate = entity.endDate;
    dto.description = entity.description;
    dto.educationLevel = entity.educationLevel as EducationLevelEnum | null;
    dto.major = entity.major;
    dto.gpa = entity.gpa;
    return dto;
  }
}

export class CreateUserEducationDto {
  @ApiProperty()
  @IsString()
  schoolId: string;

  @ApiProperty()
  @IsString()
  startDate: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  educationLevel?: EducationLevelEnum;

  @ApiProperty()
  @IsOptional()
  @IsString()
  major?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  gpa?: string;
}

export class UpdateUserEducationDto {
  @ApiProperty()
  @IsString()
  startDate: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty()
  @IsString()
  @IsOptional()
  educationLevel?: EducationLevelEnum;

  @ApiProperty()
  @IsOptional()
  @IsString()
  major?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  gpa?: string;
}
