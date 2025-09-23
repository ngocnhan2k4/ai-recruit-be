import { JobUseCases } from "@/use-cases/job/job.use-case";
import { Controller } from "@nestjs/common";

@Controller("jobs")
export class JobController {
  constructor(private readonly jobUseCases: JobUseCases) {}
}
