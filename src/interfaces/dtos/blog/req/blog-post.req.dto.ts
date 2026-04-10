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
} from "class-validator";

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
}

export class CreateBlogCommentDto {
  @ApiProperty()
  @IsString()
  parentCommentId?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content: string;
}
