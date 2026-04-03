import { IGenericRepository } from "./generic-repository.abstract";
import { Task } from "@/core/entities";

export abstract class ITaskRepository extends IGenericRepository<Task> {}
