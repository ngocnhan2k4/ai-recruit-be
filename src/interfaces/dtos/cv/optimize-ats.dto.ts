import { CvLanguageEnum } from "@/core";
import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsEnum, IsOptional } from "class-validator";

export class OptimizeAtsDto {
  @ApiProperty({
    description: "Job description to optimize CV against",
    example:
      "Looking for Senior Backend Developer with Python, FastAPI, and AWS experience...",
  })
  @IsString()
  jobDescription: string;

  @ApiProperty({
    description: "CV language",
    enum: CvLanguageEnum,
    default: CvLanguageEnum.VIETNAMESE,
  })
  @IsEnum(CvLanguageEnum)
  @IsOptional()
  language?: CvLanguageEnum;
}

// Response DTOs
export class CvPersonalInfoDto {
  name: string;
  email: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
}

export class CvExperienceDto {
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  location?: string;
  achievements: string[];
}

export class CvEducationDto {
  institution: string;
  degree: string | null;
  field: string | null;
  startDate: string | null;
  endDate: string | null;
  gpa: string | null;
  location: string | null;
}

export class CvProjectDto {
  name: string;
  description: string;
  technologies: string[];
  url?: string;
}

export class CvCertificateDto {
  name: string;
  issuer: string;
  issueDate: string | null;
  expiryDate: string | null;
  credentialId: string | null;
  credentialUrl: string | null;
}

export class CvSkillGroupDto {
  category: string;
  items: string[];
}

export class CvSkillsDto {
  technical: CvSkillGroupDto[];
  soft: string[];
}

export class OptimizedCvDataDto {
  targetJobTitle: string | null;
  personalInfo: CvPersonalInfoDto;
  summary: string;
  experience: CvExperienceDto[];
  education: CvEducationDto[];
  skills: CvSkillsDto;
  projects: CvProjectDto[];
  certificates: CvCertificateDto[];
}

export class OptimizeAtsResponseDto {
  cvData: OptimizedCvDataDto;
  atsScore: number;
  matchingSkills: string[];
  missingSkills: string[];
  recommendation: string;
  model: string;
  generatedAt: string;
}
