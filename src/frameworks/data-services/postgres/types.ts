import { ExtractTablesWithRelations } from "drizzle-orm";
import {
  NodePgDatabase,
  NodePgQueryResultHKT,
} from "drizzle-orm/node-postgres";
import { PgTransaction } from "drizzle-orm/pg-core";
import { Pool } from "pg";

export type DBDrizzle = NodePgDatabase<Record<string, never>> & {
  $client: Pool;
};
export type DBDrizzleTransaction = PgTransaction<
  NodePgQueryResultHKT,
  Record<string, never>,
  ExtractTablesWithRelations<Record<string, never>>
>;
