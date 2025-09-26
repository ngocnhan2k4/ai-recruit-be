import { JobUseCases } from "@/use-cases/job/job.use-case";
import { Controller, Get, ParseIntPipe, Query } from "@nestjs/common";
import { ApiQuery, ApiTags } from "@nestjs/swagger";

@ApiTags("Jobs")
@Controller("jobs")
export class JobController {
  constructor(private readonly jobUseCases: JobUseCases) {}

  @Get()
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Maximum number of jobs to return",
    schema: { type: "integer", default: 50 },
  })
  @ApiQuery({
    name: "offset",
    required: false,
    description: "Pagination offset",
    schema: { type: "integer", default: 0 },
  })
  @ApiQuery({
    name: "keyword",
    required: false,
    type: String,
    description: "Keyword to search in job titles",
  })
  async getAll(
    @Query("limit", ParseIntPipe) limit?: number,
    @Query("offset", ParseIntPipe) offset?: number,
    @Query("keyword") keyword?: string,
  ) {
    return this.jobUseCases.getAllJobs(limit, offset, keyword);
  }
}
