import { Controller, Get } from "@nestjs/common";
import { UserUseCases } from "src/use-cases/user/user.use-case";

@Controller("jobs")
export class JobController {
  constructor(private readonly jobUseCases: JobUseCases) {}

  @Get()
  async getAll() {
    return this.jobUseCases.getAllJobs();
  }
}
