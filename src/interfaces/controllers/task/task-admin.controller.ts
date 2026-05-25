import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from "@nestjs/swagger";
import { TaskUseCase } from "@/use-cases/task/task.use-case";
import {
  ApiResponse,
  ApiResponseDto,
  GetTasksRequestDto,
  GetTasksResponseDto,
  PaginatedResultDto,
} from "@/interfaces/dtos";
import {
  JwtAuthGuard,
  SystemAuthorizeGuard,
} from "@/frameworks/auth-services/guards";

@ApiTags("Admin Tasks")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SystemAuthorizeGuard)
@Controller("admin/tasks")
export class TaskAdminController {
  constructor(private readonly taskUseCase: TaskUseCase) {}

  @ApiOperation({
    summary: "List tasks (Admin)",
    description:
      "Get paginated list of background tasks. Supports filtering by status, type, user, error state, date range and keyword search across id/name/error/user.",
  })
  @ApiResponseDto(GetTasksResponseDto)
  @Get()
  async getTasks(
    @Query() query: GetTasksRequestDto,
  ): Promise<ApiResponse<PaginatedResultDto<GetTasksResponseDto>>> {
    return this.taskUseCase.getTasks(query);
  }

  @ApiOperation({
    summary: "Delete task (Admin)",
    description: "Soft-delete a task record.",
  })
  @ApiParam({ name: "id", description: "Task ID" })
  @Delete(":id")
  async deleteTask(
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<ApiResponse<void>> {
    return this.taskUseCase.deleteTask(id);
  }
}
