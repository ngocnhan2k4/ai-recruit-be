import { sql } from "drizzle-orm";
import { SortDirection } from "@/common/types";

export const buildSort = (
  sortBy: string,
  sortDirection: SortDirection = "desc",
) => {
  return sql`${sql.raw(sortBy)} ${sortDirection.toUpperCase()}`;
};
