import { IGenericRepository } from "./generic-repository.abstract";
import { PaginatedResult } from "@/common/types/api";
import { NewSchool, School } from "@/core";
import { CompanyFilters } from "@/core/entities/company.entity";
import { DBDrizzleTransaction } from "@/frameworks/data-services/postgres/types";

export abstract class ISchoolRepository extends IGenericRepository<School> {
  abstract getSchools(
    limit: number,
    filter?: CompanyFilters,
    cursor?: string,
  ): Promise<
    PaginatedResult<Pick<School, "id" | "name" | "logoUrl" | "address">>
  >;

  abstract getSchoolByOrganizationId(
    organizationId: string,
  ): Promise<School | null>;

  abstract createSchool(
    data: NewSchool,
    tx?: DBDrizzleTransaction,
  ): Promise<School>;

  abstract updateSchool(
    id: string,
    data: Partial<NewSchool>,
    tx?: DBDrizzleTransaction,
  ): Promise<School>;
}
