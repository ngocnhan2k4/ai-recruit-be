import { CvLanguageEnum } from "@/core";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from "class-validator";

export class CvPersonalInfoDto {
  @ApiProperty({ example: "Nguyen Van A" })
  @IsString()
  name: string;

  @ApiProperty({ example: "dev@example.com" })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: "+84 909 000 000" })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: "Ho Chi Minh, Vietnam" })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ example: "linkedin.com/in/nguyen-van-a" })
  @IsString()
  @IsOptional()
  linkedin?: string;

  @ApiPropertyOptional({ example: "github.com/nguyen-van-a" })
  @IsString()
  @IsOptional()
  github?: string;
}

export class CvExperienceDto {
  @ApiPropertyOptional({ example: "Tech Solutions Inc." })
  @IsString()
  @IsOptional()
  company?: string;

  @ApiProperty({ example: "Senior Backend Engineer" })
  @IsString()
  position: string;

  @ApiProperty({ example: "2020-01" })
  @IsString()
  startDate: string;

  @ApiProperty({ example: "Present" })
  @IsString()
  endDate: string;

  @ApiPropertyOptional({ example: "Ho Chi Minh" })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ example: ["Optimized API latency by 50%"], type: [String] })
  @IsArray()
  @IsString({ each: true })
  achievements: string[];
}

export class CvEducationDto {
  @ApiProperty({ example: "University of Technology" })
  @IsString()
  institution: string;

  @ApiPropertyOptional({ example: "Bachelor", nullable: true })
  @IsString()
  @IsOptional()
  degree: string | null;

  @ApiPropertyOptional({ example: "Computer Science", nullable: true })
  @IsString()
  @IsOptional()
  field: string | null;

  @ApiPropertyOptional({ example: "2016", nullable: true })
  @IsString()
  @IsOptional()
  startDate: string | null;

  @ApiPropertyOptional({ example: "2020", nullable: true })
  @IsString()
  @IsOptional()
  endDate: string | null;

  @ApiPropertyOptional({ example: "3.8/4.0", nullable: true })
  @IsString()
  @IsOptional()
  gpa: string | null;

  @ApiPropertyOptional({ example: "Vietnam", nullable: true })
  @IsString()
  @IsOptional()
  location: string | null;
}

export class CvProjectDto {
  @ApiProperty({ example: "E-commerce Platform" })
  @IsString()
  name: string;

  @ApiProperty({ example: "A scalable microservices system..." })
  @IsString()
  description: string;

  @ApiProperty({ example: ["NestJS", "PostgreSQL"], type: [String] })
  @IsArray()
  @IsString({ each: true })
  technologies: string[];

  @ApiPropertyOptional({ example: "https://github.com/demo/project" })
  @IsString()
  @IsOptional()
  url?: string;
}

export class CvCertificateDto {
  @ApiProperty({ example: "AWS Solutions Architect" })
  @IsString()
  name: string;

  @ApiProperty({ example: "Amazon Web Services" })
  @IsString()
  issuer: string;

  @ApiPropertyOptional({ nullable: true })
  @IsString()
  @IsOptional()
  issueDate: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsString()
  @IsOptional()
  expiryDate: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsString()
  @IsOptional()
  credentialId: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsString()
  @IsOptional()
  credentialUrl: string | null;
}

export class CvSkillGroupDto {
  @ApiProperty({ example: "Backend" })
  @IsString()
  category: string;

  @ApiProperty({ example: ["Node.js", "Go"], type: [String] })
  @IsArray()
  @IsString({ each: true })
  items: string[];
}

export class CvSkillsDto {
  @ApiProperty({ type: [CvSkillGroupDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CvSkillGroupDto)
  technical: CvSkillGroupDto[];

  @ApiProperty({ example: ["Leadership", "Communication"], type: [String] })
  @IsArray()
  @IsString({ each: true })
  soft: string[];
}

export class OptimizedCvDataDto {
  @ApiPropertyOptional({ example: "Full Stack Developer", nullable: true })
  @IsString()
  @IsOptional()
  targetJobTitle: string | null;

  @ApiProperty({ type: CvPersonalInfoDto })
  @ValidateNested()
  @Type(() => CvPersonalInfoDto)
  personalInfo: CvPersonalInfoDto;

  @ApiProperty({ example: "Highly motivated developer..." })
  @IsString()
  summary: string;

  @ApiProperty({ type: [CvExperienceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CvExperienceDto)
  experience: CvExperienceDto[];

  @ApiProperty({ type: [CvEducationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CvEducationDto)
  education: CvEducationDto[];

  @ApiProperty({ type: CvSkillsDto })
  @ValidateNested()
  @Type(() => CvSkillsDto)
  skills: CvSkillsDto;

  @ApiProperty({ type: [CvProjectDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CvProjectDto)
  projects: CvProjectDto[];

  @ApiProperty({ type: [CvCertificateDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CvCertificateDto)
  certificates: CvCertificateDto[];
}

export class AiCvDto {
  @ApiProperty({ example: "uuid-v4" })
  @IsUUID()
  id: string;

  @ApiProperty({ example: "user-uuid-v4" })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: "My Optimized CV V1" })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: "Frontend Developer", nullable: true })
  @IsString()
  @IsOptional()
  targetJobTitle: string | null;

  @ApiProperty({ type: OptimizedCvDataDto })
  @ValidateNested()
  @Type(() => OptimizedCvDataDto)
  cvData: OptimizedCvDataDto;

  @ApiPropertyOptional({ example: 85, nullable: true })
  @IsNumber()
  @IsOptional()
  atsScore: number | null;

  @ApiPropertyOptional({
    example: ["React", "TypeScript"],
    nullable: true,
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  matchingSkills: string[] | null;

  @ApiPropertyOptional({
    example: ["AWS", "Docker"],
    nullable: true,
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  missingSkills: string[] | null;

  @ApiPropertyOptional({
    example: "Consider adding more cloud experience...",
    nullable: true,
  })
  @IsString()
  @IsOptional()
  recommendation: string | null;

  @ApiPropertyOptional({ example: "Job description text...", nullable: true })
  @IsString()
  @IsOptional()
  jobDescription: string | null;

  @ApiPropertyOptional({ example: "original.pdf", nullable: true })
  @IsString()
  @IsOptional()
  originalCvFilename: string | null;

  @ApiProperty({ enum: CvLanguageEnum, example: "en" })
  @IsEnum(CvLanguageEnum)
  language: CvLanguageEnum;

  @ApiProperty({ example: false })
  @IsBoolean()
  isFavorite: boolean;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @ApiPropertyOptional({ nullable: true })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  updatedAt: Date | null;
}
export class AiCvListResponseDto {
  @ApiProperty({
    type: [AiCvDto],
    description: "Array of user CVs",
  })
  aiCvs: AiCvDto[];
}
