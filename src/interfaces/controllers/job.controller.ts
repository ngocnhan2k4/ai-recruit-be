import { JobUseCases } from "@/use-cases/job/job.use-case";
import { Controller, Get, ParseIntPipe, Query } from "@nestjs/common";
import { ApiQuery } from "@nestjs/swagger";

@Controller("jobs")
export class JobController {
  constructor(private readonly jobUseCases: JobUseCases) {}

  @Get()
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Maximum number of jobs to return",
  })
  async getAll(
    @Query("limit", new ParseIntPipe({ optional: true })) limit: number,
  ) {
    return this.jobUseCases.getAllJobs(limit);
  }
}
