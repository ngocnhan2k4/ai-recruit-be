import { JobRawUseCases } from "@/use-cases/jobRaw/jobRaw.use-case";
import { Controller, Get, ParseIntPipe, Query } from "@nestjs/common";
import { ApiQuery } from "@nestjs/swagger";

@Controller("jobs")
export class JobRawController {
  constructor(private readonly jobUseCases: JobRawUseCases) {}

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
