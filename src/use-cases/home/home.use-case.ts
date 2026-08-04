import { Injectable, Logger } from "@nestjs/common";
import { IJobRepository } from "@/core/abstracts";
import { IBlogRepository } from "@/core/abstracts/repositories/blog-repository.abstract";
import { ApiResponse, HomeDashboardDto } from "@/interfaces/dtos";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants";
import { BlogPostStatus, BlogSourceType } from "@/core/entities";
import { subDays } from "date-fns";

const HOME_TOP_APPLIED_JOBS_LIMIT = 3;
const HOME_TOP_APPLIED_LOOKBACK_DAYS = 90;

@Injectable()
export class HomeUseCases {
  private readonly logger = new Logger(HomeUseCases.name);

  constructor(
    private readonly jobRepository: IJobRepository,
    private readonly blogRepository: IBlogRepository,
  ) {}

  async getHomeDashboard(): Promise<ApiResponse<HomeDashboardDto>> {
    const toDate = new Date();
    const fromDate = subDays(toDate, HOME_TOP_APPLIED_LOOKBACK_DAYS);

    const [topAppliedJobs, aiBlogs] = await Promise.all([
      this.jobRepository.getTopAppliedJobs(
        {
          fromDate,
          toDate,
          isOpen: true,
        },
        HOME_TOP_APPLIED_JOBS_LIMIT,
      ),
      this.blogRepository.getPosts({
        status: BlogPostStatus.PUBLISHED,
        sourceType: BlogSourceType.AI,
        page: 1,
        limit: 1,
        sortBy: "createdAt",
        sortDirection: "desc",
      }),
    ]);

    const latestAiPost = aiBlogs.data[0] ?? null;

    this.logger.log(
      `Fetched home dashboard: ${topAppliedJobs.length} top jobs, ai blog=${Boolean(latestAiPost)}`,
    );

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: {
        topAppliedJobs: topAppliedJobs.map((job) => ({
          id: job.id,
          name: job.name,
          count: job.count ?? 0,
          percentage: job.percentage,
          logoUrl: job.logoUrl,
        })),
        latestAiMarketBlog: latestAiPost
          ? {
              id: latestAiPost.id,
              slug: latestAiPost.slug,
              title: latestAiPost.title,
              summary: latestAiPost.summary,
              thumbnail: latestAiPost.thumbnail,
              createdAt:
                latestAiPost.createdAt instanceof Date
                  ? latestAiPost.createdAt.toISOString()
                  : String(latestAiPost.createdAt),
              locales: latestAiPost.locales
                ? Object.fromEntries(
                    Object.entries(latestAiPost.locales).map(
                      ([lang, value]) => [
                        lang,
                        {
                          title: value?.title,
                          summary: value?.summary,
                        },
                      ],
                    ),
                  )
                : undefined,
            }
          : null,
      },
    };
  }
}
