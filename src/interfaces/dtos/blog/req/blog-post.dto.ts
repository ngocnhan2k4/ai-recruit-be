import { BlogPostStatus, BlogSourceType } from "@/core/entities";
import { GeneralQueryDto } from "@/interfaces/dtos";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";

export class BlogLocaleContentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;
}

export class BlogLocalesDto {
  @ApiPropertyOptional({ type: BlogLocaleContentDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BlogLocaleContentDto)
  vi?: BlogLocaleContentDto;

  @ApiPropertyOptional({ type: BlogLocaleContentDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BlogLocaleContentDto)
  en?: BlogLocaleContentDto;
}

export class BlogPostTagInputDto {
  @ApiPropertyOptional({ format: "uuid" })
  @ValidateIf((obj: BlogPostTagInputDto) => !obj.skillId)
  @IsUUID("4")
  tagId?: string;

  @ApiPropertyOptional({ format: "uuid" })
  @ValidateIf((obj: BlogPostTagInputDto) => !obj.tagId)
  @IsUUID("4")
  skillId?: string;
}

export class QueryBlogsDto extends GeneralQueryDto {
  @ApiPropertyOptional({ description: "Search by title" })
  @IsOptional()
  @IsString()
  declare keyword?: string;

  @ApiPropertyOptional({ description: "Filter by category" })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: "Filter by status",
    enum: BlogPostStatus,
  })
  @IsOptional()
  @IsEnum(BlogPostStatus)
  status?: BlogPostStatus;

  @ApiPropertyOptional({
    description:
      "Filter by source type (ADMIN = manually by admin, AI = AI-generated, CRAWLED = crawled)",
    enum: BlogSourceType,
  })
  @IsOptional()
  @IsEnum(BlogSourceType)
  sourceType?: BlogSourceType;

  @ApiPropertyOptional({
    description:
      "Filter by skill IDs (comma-separated UUIDs) — returns posts tagged with any of these skills",
  })
  @IsOptional()
  @Transform(({ value }: { value: string }) =>
    typeof value === "string" ? value.split(",").filter(Boolean) : value,
  )
  skillIds?: string[];
}

export class CreateBlogPostDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ type: BlogLocalesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BlogLocalesDto)
  locales?: BlogLocalesDto;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  summary: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  thumbnail?: string | null;

  @ApiPropertyOptional({ type: [BlogPostTagInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlogPostTagInputDto)
  tags?: BlogPostTagInputDto[];
}

export class SaveDraftBlogPostDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ type: BlogLocalesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BlogLocalesDto)
  locales?: BlogLocalesDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  thumbnail?: string | null;

  @ApiPropertyOptional({ type: [BlogPostTagInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlogPostTagInputDto)
  tags?: BlogPostTagInputDto[];
}

export class UpdateBlogPostDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ type: BlogLocalesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BlogLocalesDto)
  locales?: BlogLocalesDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  thumbnail?: string | null;

  @ApiPropertyOptional({ type: [BlogPostTagInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlogPostTagInputDto)
  tags?: BlogPostTagInputDto[];
}

export class QueryBlogTagsDto extends GeneralQueryDto {}

export class UpdateBlogStatusRequest {
  @ApiProperty({
    description: "Blog post status",
    enum: ["approved", "rejected"],
  })
  @IsNotEmpty()
  @IsEnum(["approved", "rejected"])
  status: "approved" | "rejected";
}

export class CreateBlogCategoryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateBlogTagDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}

export class GenerateAiBlogDto {
  @ApiPropertyOptional({
    description:
      "Inclusive end date (YYYY-MM-DD) for the job market window. Defaults to today. Use to backfill a missed weekly post.",
    example: "2026-07-20",
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: "date must be YYYY-MM-DD",
  })
  date?: string;
}

export class QueryBlogCategoriesDto extends GeneralQueryDto {}
