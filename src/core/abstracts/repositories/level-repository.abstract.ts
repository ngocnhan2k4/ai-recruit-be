import { Level } from "@/core";
import { IGenericRepository } from "./generic-repository.abstract";

export abstract class ILevelRepository extends IGenericRepository<Level> {
  abstract getLevelsByArea(areaId: string): Promise<Level[]>;

  abstract findLevelByScore(
    areaId: string,
    score: number,
  ): Promise<Level | null>;

  abstract createMany(levels: Partial<Level>[]): Promise<Level[]>;
}
