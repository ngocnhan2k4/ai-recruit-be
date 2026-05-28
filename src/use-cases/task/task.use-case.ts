import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants";
import { PaginatedResult } from "@/common/types";
import { ITaskRepository, TaskFilter } from "@/core";
import { ApiResponse, GetTasksResponseDto } from "@/interfaces/dtos";
import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class TaskUseCase {
  private readonly logger = new Logger(TaskUseCase.name);

  constructor(private readonly taskRepository: ITaskRepository) {}

  async getTasks(
    filter: TaskFilter,
  ): Promise<ApiResponse<PaginatedResult<GetTasksResponseDto>>> {
    const result = await this.taskRepository.getTasks(filter);

    this.logger.log(
      `Retrieved ${result.data.length}/${result.pagination.total ?? 0} tasks for admin`,
    );

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: {
        data: result.data as unknown as GetTasksResponseDto[],
        pagination: result.pagination,
      },
    };
  }

  async deleteTask(id: string): Promise<ApiResponse<void>> {
    const existing = await this.taskRepository.get(id);
    if (!existing) {
      return {
        code: RESPONSE_CODE.TASK_NOT_FOUND,
        message: RESPONSE_MESSAGE.TASK_NOT_FOUND,
      };
    }

    const result = await this.taskRepository.delete({ id });
    if (result.length === 0) {
      return {
        code: RESPONSE_CODE.TASK_NOT_FOUND,
        message: RESPONSE_MESSAGE.TASK_NOT_FOUND,
      };
    }

    this.logger.log(`Task ${id} soft-deleted by admin`);

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: "Task deleted successfully",
    };
  }
}
