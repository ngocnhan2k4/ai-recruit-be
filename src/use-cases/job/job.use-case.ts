import { Injectable } from "@nestjs/common";
//import { CreateUserDto, UpdateUserDto } from "../../intefaces/dtos";
import { User } from "../../core/entities";
import { IDataServices } from "../../core/abstracts";
import { UserFactoryService } from "./job-factory.service";

@Injectable()
export class JobUseCases {
  constructor(
    private readonly dataServices: IDataServices,
    private readonly jobFactoryService: JobFactoryService,
  ) {}

  async getAllUsers(): Promise<User[]> {
    return this.dataServices.users.getAll();
  }
  // async getUserById(id: number): Promise<User> {
  //     return this.dataServices.users.get(id);
  // }

  // async createUser(createUserDto: CreateUserDto): Promise<User> {
  //     const newUser = this.userFactoryService.createNewUser(createUserDto);
  //     return this.dataServices.users.create(newUser);
  // }

  // async updateUser(id: number, updateUserDto: UpdateUserDto): Promise<User> {
  //     const existingUser = await this.dataServices.users.get(id);
  //     const updatedUser = this.userFactoryService.updateUser(existingUser, updateUserDto);
  //     return this.dataServices.users.update(id, updatedUser);
  // }
}
