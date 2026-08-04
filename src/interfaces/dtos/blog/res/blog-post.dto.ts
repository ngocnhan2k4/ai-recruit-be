import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class BlogAuthorDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ nullable: true })
  avatarUrl?: string | null;
}

export class BlogTagItemDto {
  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ nullable: true })
  skillId: string | null;

  @ApiPropertyOptional({ nullable: true })
  tagId: string | null;
}

export class BlogPostSourceDto {
  @ApiPropertyOptional({ nullable: true })
  url?: string | null;

  @ApiPropertyOptional({ nullable: true })
  author?: string | null;

  @ApiPropertyOptional({ nullable: true })
  platform?: string | null;
}

export class BlogLocaleContentResponseDto {
  @ApiPropertyOptional()
  title?: string;

  @ApiPropertyOptional()
  summary?: string;

  @ApiPropertyOptional({
    description: "Present on detail endpoints only; omitted from list payloads",
  })
  content?: string;
}

export class BlogLocalesResponseDto {
  @ApiPropertyOptional({ type: BlogLocaleContentResponseDto })
  vi?: BlogLocaleContentResponseDto;

  @ApiPropertyOptional({ type: BlogLocaleContentResponseDto })
  en?: BlogLocaleContentResponseDto;
}

export class BlogPostListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional({ type: BlogLocalesResponseDto })
  locales?: BlogLocalesResponseDto;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  summary: string;

  @ApiPropertyOptional({ nullable: true })
  thumbnail?: string | null;

  @ApiProperty({ description: "Category UUID" })
  categoryId: string;

  @ApiProperty({ description: "Category display name" })
  categoryName: string;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional({ nullable: true })
  updatedAt?: Date | null;

  @ApiProperty()
  likes: number;

  @ApiProperty()
  status: string;

  @ApiProperty({ enum: ["USER", "AI", "CRAWLED"] })
  sourceType?: string;

  @ApiPropertyOptional({ type: BlogPostSourceDto, nullable: true })
  source?: BlogPostSourceDto | null;

  @ApiProperty({ type: [BlogTagItemDto] })
  tags: BlogTagItemDto[];
}

export class BlogListPaginationDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class BlogPostListResponseDto {
  @ApiProperty({ type: [BlogPostListItemDto] })
  items: BlogPostListItemDto[];

  @ApiProperty({ type: BlogListPaginationDto })
  pagination: BlogListPaginationDto;
}

export class BlogPostDetailDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional({ type: BlogLocalesResponseDto })
  locales?: BlogLocalesResponseDto;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  summary: string;

  @ApiPropertyOptional({ nullable: true })
  thumbnail?: string | null;

  @ApiProperty()
  content: string;

  @ApiProperty({ description: "Category UUID" })
  categoryId: string;

  @ApiProperty({ description: "Category display name" })
  categoryName: string;

  @ApiProperty()
  viewCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional({ nullable: true })
  updatedAt?: Date | null;

  @ApiPropertyOptional({ type: BlogAuthorDto, nullable: true })
  author?: BlogAuthorDto | null;

  @ApiProperty()
  likes: number;

  @ApiProperty()
  isSaved: boolean;

  @ApiProperty()
  isLiked: boolean;

  @ApiProperty()
  status: string;

  @ApiProperty({ enum: ["USER", "AI", "CRAWLED"] })
  sourceType?: string;

  @ApiPropertyOptional({ type: BlogPostSourceDto, nullable: true })
  source?: BlogPostSourceDto | null;

  @ApiProperty({ type: [BlogTagItemDto] })
  tags: BlogTagItemDto[];
}

export class BlogCategoryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}

export class BlogTagCursorItemDto {
  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ nullable: true })
  skillId: string | null;

  @ApiPropertyOptional({ nullable: true })
  tagId: string | null;
}

export class BlogTagCursorPaginationDto {
  @ApiPropertyOptional({ nullable: true })
  nextCursor?: string | null;

  @ApiProperty()
  hasNextPage: boolean;
}

export class BlogTagCursorResponseDto {
  @ApiProperty({ type: [BlogTagCursorItemDto] })
  items: BlogTagCursorItemDto[];

  @ApiProperty({ type: BlogTagCursorPaginationDto })
  pagination: BlogTagCursorPaginationDto;
}
