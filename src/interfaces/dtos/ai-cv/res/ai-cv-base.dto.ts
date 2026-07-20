import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsString, IsOptional, ValidateNested } from "class-validator";

export class CvSocialLinkDto {
  @ApiPropertyOptional({
    example: "linkedin.com/in/nguyen-van-a",
    nullable: true,
  })
  @IsString()
  @IsOptional()
  name?: string | null;

  @ApiPropertyOptional({
    example: "https://linkedin.com/in/nguyen-van-a",
    nullable: true,
  })
  @IsString()
  @IsOptional()
  url?: string | null;
}

export class CvPersonalInfoDto {
  @ApiPropertyOptional({ example: "Nguyen Van A" })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: "dev@example.com" })
  @IsString()
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

  @ApiPropertyOptional({
    example: "https://cdn.example.com/avatar.jpg",
    nullable: true,
  })
  @IsString()
  @IsOptional()
  avatarUrl?: string | null;

  @ApiPropertyOptional({ type: CvSocialLinkDto, nullable: true })
  @ValidateNested()
  @Type(() => CvSocialLinkDto)
  @IsOptional()
  linkedin?: CvSocialLinkDto | null;

  @ApiPropertyOptional({ type: CvSocialLinkDto, nullable: true })
  @ValidateNested()
  @Type(() => CvSocialLinkDto)
  @IsOptional()
  github?: CvSocialLinkDto | null;
}

export class CvExperienceDto {
  @ApiPropertyOptional({ example: "Tech Solutions Inc." })
  @IsString()
  @IsOptional()
  company?: string;

  @ApiPropertyOptional({ example: "Senior Backend Engineer" })
  @IsString()
  @IsOptional()
  position?: string;

  @ApiPropertyOptional({ example: "2020-01" })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: "Present" })
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ example: "Ho Chi Minh" })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({
    example: ["Optimized API latency by 50%"],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  achievements?: string[];
}

export class CvEducationDto {
  @ApiPropertyOptional({ example: "University of Technology" })
  @IsString()
  @IsOptional()
  institution?: string;

  @ApiPropertyOptional({ example: "Bachelor", nullable: true })
  @IsString()
  @IsOptional()
  degree?: string | null;

  @ApiPropertyOptional({ example: "Computer Science", nullable: true })
  @IsString()
  @IsOptional()
  field?: string | null;

  @ApiPropertyOptional({ example: "2016", nullable: true })
  @IsString()
  @IsOptional()
  startDate?: string | null;

  @ApiPropertyOptional({ example: "2020", nullable: true })
  @IsString()
  @IsOptional()
  endDate?: string | null;

  @ApiPropertyOptional({ example: "3.8/4.0", nullable: true })
  @IsString()
  @IsOptional()
  gpa?: string | null;

  @ApiPropertyOptional({ example: "Vietnam", nullable: true })
  @IsString()
  @IsOptional()
  location?: string | null;
}

export class CvProjectDto {
  @ApiPropertyOptional({ example: "E-commerce Platform" })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: "ECOM", nullable: true })
  @IsString()
  @IsOptional()
  shortName?: string | null;

  @ApiPropertyOptional({ example: "A scalable microservices system..." })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: ["NestJS", "PostgreSQL"], type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  technologies?: string[];

  @ApiPropertyOptional({ example: "https://github.com/demo/project" })
  @IsString()
  @IsOptional()
  url?: string;
}

export class CvCertificateDto {
  @ApiPropertyOptional({ example: "AWS Solutions Architect" })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: "Amazon Web Services" })
  @IsString()
  @IsOptional()
  issuer?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsString()
  @IsOptional()
  issueDate?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsString()
  @IsOptional()
  expiryDate?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsString()
  @IsOptional()
  credentialId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsString()
  @IsOptional()
  credentialUrl?: string | null;
}

export class CvSkillGroupDto {
  @ApiPropertyOptional({ example: "Backend" })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ example: ["Node.js", "Go"], type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  items?: string[];
}

export class CvSkillsDto {
  @ApiPropertyOptional({ type: [CvSkillGroupDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CvSkillGroupDto)
  @IsOptional()
  technical?: CvSkillGroupDto[];

  @ApiPropertyOptional({
    example: ["Leadership", "Communication"],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  soft?: string[];
}

export class OptimizedCvDataDto {
  @ApiPropertyOptional({ example: "Full Stack Developer", nullable: true })
  @IsString()
  @IsOptional()
  targetJobTitle?: string | null;

  @ApiPropertyOptional({ type: CvPersonalInfoDto })
  @ValidateNested()
  @Type(() => CvPersonalInfoDto)
  @IsOptional()
  personalInfo?: CvPersonalInfoDto;

  @ApiPropertyOptional({ example: "Highly motivated developer..." })
  @IsString()
  @IsOptional()
  summary?: string;

  @ApiPropertyOptional({ type: [CvExperienceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CvExperienceDto)
  @IsOptional()
  experience?: CvExperienceDto[];

  @ApiPropertyOptional({ type: [CvEducationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CvEducationDto)
  @IsOptional()
  education?: CvEducationDto[];

  @ApiPropertyOptional({ type: CvSkillsDto })
  @ValidateNested()
  @Type(() => CvSkillsDto)
  @IsOptional()
  skills?: CvSkillsDto;

  @ApiPropertyOptional({ type: [CvProjectDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CvProjectDto)
  @IsOptional()
  projects?: CvProjectDto[];

  @ApiPropertyOptional({ type: [CvCertificateDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CvCertificateDto)
  @IsOptional()
  certificates?: CvCertificateDto[];
}
