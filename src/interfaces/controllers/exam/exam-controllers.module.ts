import { Module } from "@nestjs/common";
import { AdminExamController } from "./admin-exam.controller";
import { ExamController } from "./exam.controller";
import { ExamUseCasesModule } from "@/use-cases/exam/exam-use-cases.module";

@Module({
  imports: [ExamUseCasesModule],
  controllers: [AdminExamController, ExamController],
})
export class ExamControllersModule {}
