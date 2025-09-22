import { Injectable } from "@nestjs/common";
import { IDataServices, PostgresJobRawRepository } from "../../../core";
import { PostgresGenericRepository } from "./postgres-generic-repository";
import { User } from "../../../core/entities";
import { IGenericRepository } from "../../../core";
import { users } from "./model";

@Injectable()
export class PostgresDataServices implements IDataServices {
  users: IGenericRepository<User>;

  jobs: PostgresJobRawRepository;

  constructor() {
    this.users = new PostgresGenericRepository<User, typeof users>(users);
    this.jobs = new PostgresJobRawRepository();
  }
}
