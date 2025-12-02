import { Module } from "@nestjs/common";
import { JobMatchingUseCases } from "./job-matching.use-cases";
import { EmailModule } from "@/frameworks/email-services/email.module";

@Module({
  imports: [EmailModule],
  providers: [JobMatchingUseCases],
  exports: [JobMatchingUseCases],
})
export class JobMatchingUseCasesModule {}
