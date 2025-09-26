import { Injectable, NotFoundException } from "@nestjs/common";
import { ApiResponse, GetUserDto } from "@/interfaces/dtos";
import { User } from "../../core/entities";
import { IDataServices } from "../../core/abstracts";
import { UserFactoryService } from "./user-factory.service";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants/constants";

@Injectable()
export class UserUseCases {
  constructor(
    private readonly dataServices: IDataServices,
    private readonly userFactoryService: UserFactoryService,
  ) {}

  async getAllUsers(): Promise<User[]> {
    return this.dataServices.users.getAll();
  }

  async getUserById(id: number): Promise<ApiResponse<GetUserDto>> {
    const user: User | null = await this.dataServices.users.get(id);
    if (!user) {
      throw new NotFoundException(
        new ApiResponse({
          message: RESPONSE_MESSAGE.USER_NOT_FOUND,
          code: RESPONSE_CODE.USER_NOT_FOUND,
        }),
      );
    }
    const userDto = GetUserDto.from(user);
    return new ApiResponse<GetUserDto>({
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: userDto,
    });
  }

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
