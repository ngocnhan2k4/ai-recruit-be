import { GenericRepository } from "./generic-repository";
import { type DBDrizzle } from "../types";
import { Inject, Injectable } from "@nestjs/common";
import { users } from "../models";
import { User } from "@/core/entities";

@Injectable()
export class UserRepository extends GenericRepository<User, typeof users> {
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, users);
  }
}
