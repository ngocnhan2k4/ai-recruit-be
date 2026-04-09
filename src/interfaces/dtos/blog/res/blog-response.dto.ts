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

export class BlogCommentDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ type: BlogAuthorDto })
  author: BlogAuthorDto;
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

  @ApiProperty({ type: [BlogCommentDto] })
  comments: BlogCommentDto[];

  @ApiProperty()
  likes: number;
}

export class BlogLikeResponseDto {
  @ApiProperty()
  liked: boolean;
}
