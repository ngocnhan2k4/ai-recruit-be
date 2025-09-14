import { Injectable } from "@nestjs/common";
import { IDataServices } from "../../../core";
import { PostgresGenericRepository } from "./postgres-generic-repository";
import { User } from "../../../core/entities";
import { IGenericRepository } from "../../../core";
import { users } from "./model";



@Injectable()
export class PostgresDataServices implements IDataServices {
  users: IGenericRepository<User>;
    constructor() {
        this.users = new PostgresGenericRepository<User, typeof users>(users);
    }
}