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

export class BlogPostListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  summary: string;

  @ApiPropertyOptional({ nullable: true })
  thumbnail?: string | null;

  @ApiProperty()
  category: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  likes: number;

  @ApiProperty()
  status: string;

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

  @ApiProperty()
  slug: string;

  @ApiProperty()
  summary: string;

  @ApiPropertyOptional({ nullable: true })
  thumbnail?: string | null;

  @ApiProperty()
  content: string;

  @ApiProperty()
  category: string;

  @ApiProperty()
  viewCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: BlogAuthorDto })
  author: BlogAuthorDto;

  @ApiProperty()
  likes: number;

  @ApiProperty()
  isSaved: boolean;

  @ApiProperty()
  isLiked: boolean;

  @ApiProperty()
  status: string;

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
