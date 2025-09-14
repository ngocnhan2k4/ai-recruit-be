import { Injectable } from "@nestjs/common";
import { CreateUserDto, UpdateUserDto } from "../../intefaces/dtos";
import { User } from "../../core/entities";


@Injectable()
export class UserFactoryService{
    createNewUser(createUserDto: CreateUserDto): User {
        const user = new User();
        user.email = createUserDto.email;
        user.name = createUserDto.name;
        user.age = createUserDto.age;
        return user;
    }

    updateUser(user: User, updateUserDto: UpdateUserDto): User {
        user = {...user, ...updateUserDto};
        return user;
    }

}