import { Injectable, Inject } from "@nestjs/common";
import { GenericRepository } from "./generic-repository";
import { type DBDrizzle } from "../types";
import { tasks } from "../models/task.model";
import { Task } from "@/core/entities";
import { ITaskRepository } from "@/core/abstracts/repositories/task-repository.abstract";

@Injectable()
export class TaskRepository
  extends GenericRepository<Task, typeof tasks>
  implements ITaskRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, tasks);
  }
}
