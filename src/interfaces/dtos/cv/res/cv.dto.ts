import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsDate } from "class-validator";

export class CvDto {
  @ApiProperty({
    example: "uuid-cv-id",
    description: "CV ID",
  })
  id: string;

  @ApiProperty({
    example: "My Software Engineer CV",
    description: "Name of the CV",
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: "uuid-user-id",
    description: "User ID",
  })
  userId: string;

  @ApiProperty({
    example: "https://example.com/cv.pdf",
    description: "URL of the CV file",
  })
  fileUrl: string;

  @ApiProperty({
    example: "My Software Engineer CV.pdf",
    description: "Original filename of the CV file",
  })
  fileName: string;

  @ApiProperty({
    example: "application/pdf",
    description: "MIME type of the CV file",
  })
  mimeType: string;

  @ApiProperty({
    description: "Last used timestamp",
  })
  lastUsed: Date;

  @ApiProperty({
    description: "Created at timestamp",
  })
  @IsDate()
  createdAt: Date;

  @ApiProperty({
    description: "Updated at timestamp",
    required: false,
  })
  updatedAt: Date | null;
}

export class CvListResponseDto {
  @ApiProperty({
    type: [CvDto],
    description: "Array of user CVs",
  })
  cvs: CvDto[];
}

// DTOs for CV Optimize ATS

export interface CVPersonalInfo {
  name: string;
  email: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
}

export interface CVExperience {
  company: string;
  position: string;
  startDate: string; // Format: "YYYY-MM"
  endDate: string; // Format: "YYYY-MM" or "Present"
  location?: string;
  achievements: string[];
}

export interface CVEducation {
  institution: string;
  degree: string;
  field: string;
  startDate: string; // Format: "YYYY"
  endDate: string; // Format: "YYYY" or "Present"
  location?: string;
}

export interface CVProject {
  name: string;
  description: string;
  technologies: string[];
  url?: string | null;
}

export interface CVSkills {
  technical: string[];
  soft: string[];
}

export interface CVCertification {
  name: string;
  issuer: string;
  date: string;
  url?: string;
}

export interface CVLanguage {
  name: string;
  proficiency: string;
}

export interface CVData {
  personalInfo: CVPersonalInfo;
  summary: string;
  experience: CVExperience[];
  education: CVEducation[];
  skills: CVSkills;
  projects: CVProject[];
  certifications?: CVCertification[];
  languages?: CVLanguage[];
  personal_info?: CVPersonalInfo;
}
