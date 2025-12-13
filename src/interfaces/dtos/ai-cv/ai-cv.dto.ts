import { CvLanguageEnum, CvTemplateEnum } from "@/core";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

export class CvPersonalInfoDto {
  @ApiProperty({ example: "Nguyen Van A" })
  @IsString()
  name: string;

  @ApiProperty({ example: "dev@example.com" })
  @IsEmail()
  @IsOptional()
  email?: string;

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

  @ApiProperty({ enum: CvTemplateEnum, example: CvTemplateEnum.CLASSIC })
  @IsEnum(CvTemplateEnum)
  template: CvTemplateEnum;

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

export class AiCvRequestDto {
  @ApiProperty({
    example: "My Optimized CV for Backend Dev",
    description: "The display title of the CV",
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    example: "Senior Backend Engineer",
    description: "The specific job title this CV targets",
  })
  @IsString()
  @IsOptional()
  targetJobTitle?: string;

  @ApiProperty({
    type: OptimizedCvDataDto,
    description: "The structured JSON data of the CV",
  })
  @ValidateNested()
  @Type(() => OptimizedCvDataDto)
  @IsNotEmpty()
  cvData: OptimizedCvDataDto;

  @ApiPropertyOptional({
    example: 85,
    description: "The calculated ATS score (0-100)",
    minimum: 0,
    maximum: 100,
  })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  atsScore?: number;

  @ApiPropertyOptional({
    example: ["Java", "Spring Boot", "Docker"],
    type: [String],
    description: "Skills from the CV that matched the job description",
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  matchingSkills?: string[];

  @ApiPropertyOptional({
    example: ["Kubernetes", "AWS"],
    type: [String],
    description: "Skills required by the job but missing from the CV",
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  missingSkills?: string[];

  @ApiPropertyOptional({
    example:
      "Consider highlighting your cloud infrastructure experience more...",
    description: "AI-generated advice for improvement",
  })
  @IsString()
  @IsOptional()
  recommendation?: string;

  @ApiPropertyOptional({
    example: "We are looking for a Senior Java Developer...",
    description: "The original job description text used for optimization",
  })
  @IsString()
  @IsOptional()
  jobDescription?: string;

  @ApiPropertyOptional({
    example: "my_original_resume.pdf",
    description: "Filename of the uploaded source CV",
  })
  @IsString()
  @IsOptional()
  originalCvFilename?: string;

  @ApiPropertyOptional({
    enum: CvLanguageEnum,
    example: CvLanguageEnum.VIETNAMESE,
    default: CvLanguageEnum.VIETNAMESE,
  })
  @IsEnum(CvLanguageEnum)
  @IsOptional()
  language?: CvLanguageEnum;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description: "Whether to mark this CV as a favorite",
  })
  @IsBoolean()
  @IsOptional()
  isFavorite?: boolean;

  @ApiPropertyOptional({
    enum: CvTemplateEnum,
    example: CvTemplateEnum.CLASSIC,
    default: CvTemplateEnum.CLASSIC,
    description: "CV template to use for rendering",
  })
  @IsEnum(CvTemplateEnum)
  @IsOptional()
  template?: CvTemplateEnum;
}

export class UpdateAiCvDto extends PartialType(AiCvRequestDto) {}
