import {
  LearningRoadmap,
  LearningRoadmapWithDetails,
  RoadmapProgressStats,
} from "@/core";
import { IGenericRepository } from "./generic-repository.abstract";
import { GeneralQuery, PaginatedResult } from "@/common/types/api";

export abstract class ILearningRoadmapRepository extends IGenericRepository<LearningRoadmap> {
  abstract getPaginatedRoadmaps(
    query: GeneralQuery & { userId: string },
  ): Promise<PaginatedResult<LearningRoadmap>>;

  abstract getRoadmapWithDetails(
    roadmapId: string,
  ): Promise<LearningRoadmapWithDetails | null>;

  abstract getProgressStats(roadmapId: string): Promise<RoadmapProgressStats>;

  abstract updateProgress(roadmapId: string, tx?: any): Promise<void>;
}
