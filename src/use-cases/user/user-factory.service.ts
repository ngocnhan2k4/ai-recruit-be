import { Injectable } from "@nestjs/common";
import { CreateUserDto, UpdateUserDto } from "../../interfaces/dtos";
import { User } from "../../core/entities";

@Injectable()
export class UserFactoryService {
  createNewUser(createUserDto: CreateUserDto): User {
    const user = new User({
      email: createUserDto.email,
      name: createUserDto.name,
      age: createUserDto.age,
    });
    return user;
  }

  updateUser(user: User, updateUserDto: UpdateUserDto): User {
    user = { ...user, ...updateUserDto };
    return user;
  }
}
