import { Injectable } from "@nestjs/common";
import { CreateUserDto, UpdateUserDto } from "../../interfaces/dtos";
import { User } from "../../core/entities";

@Injectable()
export class UserFactoryService {
  createNewUser(createUserDto: CreateUserDto): User | null {
    // const user = new User({
    //   email: createUserDto.email,
    //   name: createUserDto.name,
    //   age: createUserDto.age,
    //   firebaseUid: createUserDto.firebaseUid,
    //   roles: createUserDto.roles || ["user"],
    //   createdAt: new Date(),
    //   updatedAt: new Date(),
    //   avatar: createUserDto.avatar,
    // });
    return null;
  }

  updateUser(user: User, updateUserDto: UpdateUserDto): User {
    user = { ...user, ...updateUserDto };
    return user;
  }
}
