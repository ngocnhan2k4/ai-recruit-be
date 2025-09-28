import { Injectable, NotFoundException } from "@nestjs/common";
//import { CreateUserDto, UpdateUserDto } from "../../intefaces/dtos";
import { User } from "../../core/entities";
import { IDataServices } from "../../core/abstracts";
import { UserFactoryService } from "./user-factory.service";
import { UserPublicDto, UpdateUserDto } from "@/interfaces/dtos";
import { RESPONSE_MESSAGE } from "@/common/constants/response";

@Injectable()
export class UserUseCases {
  constructor(
    private readonly dataServices: IDataServices,
    private readonly userFactoryService: UserFactoryService,
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

  async getUserProfile(userId: number): Promise<User> {
    const user = await this.dataServices.users.get(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  async getUserByUsername(username: string): Promise<UserPublicDto> {
    const user = await this.dataServices.users.getByField({ username });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return {
      username: user.username,
      name: user.name,
      avatarUrl: user.avatarUrl || "",
    };
  }

  async updateUserProfile(
    userId: number,
    updateUserDto: UpdateUserDto,
  ): Promise<User> {
    const user = await this.dataServices.users.get(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const updatedUser = this.userFactoryService.updateUser(user, updateUserDto);
    const result = await this.dataServices.users.update(userId, updatedUser);
    if (!result) {
      throw new NotFoundException(RESPONSE_MESSAGE.USER_NOT_UPDATED);
    }
    return result;
  }
}
