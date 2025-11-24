import { RoadmapPhase } from "@/core";
import { IGenericRepository } from "./generic-repository.abstract";
import { DBDrizzleTransaction } from "@/frameworks/data-services/postgres/types";

export abstract class IRoadmapPhaseRepository extends IGenericRepository<RoadmapPhase> {
  abstract getPhasesByRoadmapId(roadmapId: string): Promise<RoadmapPhase[]>;

  abstract createPhases(
    phases: Partial<RoadmapPhase>[],
  ): Promise<RoadmapPhase[]>;

  abstract markPhaseCompleted(
    phaseId: string,
    tx?: DBDrizzleTransaction,
  ): Promise<RoadmapPhase>;
}
