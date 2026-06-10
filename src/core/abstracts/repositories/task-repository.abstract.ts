import { IGenericRepository } from "./generic-repository.abstract";
import { ListTaskResponse, Task, TaskFilter } from "@/core/entities";
import { PaginatedResult } from "@/common/types";

export abstract class ITaskRepository extends IGenericRepository<Task> {
  abstract getTasks(
    filter: TaskFilter,
  ): Promise<PaginatedResult<ListTaskResponse>>;
}
