import type { Activity, ActivitySearchFilters } from "@/core/entities/activity";
import { PaginatedResult } from "@/common/types";
import { IGenericRepository } from "./generic-repository.abstract";

export abstract class IActivityRepository extends IGenericRepository<Activity> {
  abstract getListActivities(
    filters: ActivitySearchFilters,
  ): Promise<PaginatedResult<Activity>>;

  abstract getActivityById(id: string): Promise<Activity | null>;
}
