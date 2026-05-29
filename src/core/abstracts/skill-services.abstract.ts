import { SkillFilter, SkillSynonymResponse } from "../entities";
import { PaginatedResult } from "@/common/types";

export abstract class ISkillService {
  abstract getSkillsSynonyms(
    request: SkillFilter,
  ): Promise<PaginatedResult<SkillSynonymResponse>>;
}
