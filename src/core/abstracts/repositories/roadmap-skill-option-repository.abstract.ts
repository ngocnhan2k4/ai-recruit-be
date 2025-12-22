import { RoadmapSkillOption } from "@/core";
import { IGenericRepository } from "./generic-repository.abstract";
import { DBDrizzleTransaction } from "@/frameworks/data-services/postgres/types";

export abstract class IRoadmapSkillOptionRepository extends IGenericRepository<RoadmapSkillOption> {
  abstract getOptionsBySkillId(skillId: string): Promise<RoadmapSkillOption[]>;

  abstract createManyOptions(
    options: Partial<RoadmapSkillOption>[],
    tx?: DBDrizzleTransaction,
  ): Promise<RoadmapSkillOption[]>;

  abstract markOptionCompleted(
    optionId: string,
    tx?: DBDrizzleTransaction,
  ): Promise<RoadmapSkillOption>;
}
