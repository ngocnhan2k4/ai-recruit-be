import { Module } from "@nestjs/common";
import { TaskUseCase } from "./task.use-case";

@Module({
  providers: [TaskUseCase],
  exports: [TaskUseCase],
})
export class TaskUseCasesModule {}
