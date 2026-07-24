import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class HomeTopJobDto {
  @ApiProperty({ example: "uuid" })
  id: string;

  @ApiProperty({ example: "Frontend Developer" })
  name: string;

  @ApiProperty({ example: 42, description: "Number of applications" })
  count: number;

  @ApiProperty({
    example: 28,
    description: "Share of applications among the returned top jobs",
  })
  percentage: number;

  @ApiPropertyOptional()
  logoUrl?: string;
}

export class HomeAiMarketBlogLocaleDto {
  @ApiPropertyOptional()
  title?: string;

  @ApiPropertyOptional()
  summary?: string;
}

export class HomeAiMarketBlogDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: "weekly-ai-job-market-2026-07-19" })
  slug: string;

  @ApiProperty({ description: "Default/fallback title" })
  title: string;

  @ApiProperty({ description: "Default/fallback summary" })
  summary: string;

  @ApiPropertyOptional({ nullable: true })
  thumbnail: string | null;

  @ApiProperty()
  createdAt: string;

  @ApiPropertyOptional({
    type: "object",
    additionalProperties: {
      $ref: "#/components/schemas/HomeAiMarketBlogLocaleDto",
    },
    description: "Localized title/summary by language code (vi, en, ...)",
  })
  locales?: Record<string, HomeAiMarketBlogLocaleDto>;
}

export class HomeDashboardDto {
  @ApiProperty({
    type: [HomeTopJobDto],
    description: "Top jobs ranked by application count (desc)",
  })
  topAppliedJobs: HomeTopJobDto[];

  @ApiPropertyOptional({
    type: HomeAiMarketBlogDto,
    nullable: true,
    description:
      "Latest published AI weekly job-market analysis blog, or null if none",
  })
  latestAiMarketBlog: HomeAiMarketBlogDto | null;
}
