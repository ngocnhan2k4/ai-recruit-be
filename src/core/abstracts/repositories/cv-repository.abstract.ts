import { GeneralQuery } from "@/common/types";
import { IGenericRepository } from "./generic-repository.abstract";
import { Cv } from "@/core/entities";

export abstract class ICvRepository extends IGenericRepository<Cv> {
  /** CV rows eligible for ES bulk sync (not soft-deleted), paginated. */
  abstract getCvs(
    query: GeneralQuery,
  ): Promise<
    Array<
      Pick<Cv, "id" | "userId" | "name" | "fileUrl" | "mimeType" | "updatedAt">
    >
  >;

  abstract count(): Promise<number>;
}
