import { PostgresGenericRepository } from "./generic-postgres-repository";
import { type DBDrizzle } from "../types";
import { Inject, Injectable } from "@nestjs/common";
import { users } from "../schema";
import { User } from "@/core/entities";

@Injectable()
export class UserPostgresRepository extends PostgresGenericRepository<
  User,
  typeof users
> {
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, users);
  }
}
