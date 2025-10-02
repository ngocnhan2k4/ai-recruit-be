import { Module } from "@nestjs/common";
import { JobUseCases } from "./job.use-case";

@Module({
  imports: [],
  providers: [JobUseCases],
  exports: [JobUseCases],
})
export class JobUseCasesModule {}
