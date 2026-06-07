import { GeneralQueryDto } from "@/interfaces/dtos";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
  ValidateNested,
  IsEnum,
} from "class-validator";
import { BlogPostStatus, BlogSourceType } from "@/core/entities";

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
    description: "Filter by source type",
    enum: BlogSourceType,
  })
  @IsOptional()
  @IsEnum(BlogSourceType)
  sourceType?: BlogSourceType;
}

export class CreateBlogPostDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

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

export class QueryBlogCategoriesDto extends GeneralQueryDto {}
