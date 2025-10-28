import { GeneralQuery, PaginatedResult } from "@/common/types/api";
import { IGenericRepository } from "./generic-repository.abstract";
import { OrganizationWithDetails } from "@/core/entities";

export abstract class IOrganizationRepository extends IGenericRepository<OrganizationWithDetails> {
  abstract getOrganizationById(
    id: string,
  ): Promise<OrganizationWithDetails | null>;

  abstract getAllOrganizations(
    query: GeneralQuery,
  ): Promise<
    PaginatedResult<
      Pick<
        OrganizationWithDetails,
        "id" | "name" | "logoUrl" | "description" | "foundedYear"
      >
    >
  >;
}
