import { IsEmail, IsInt, IsString,} from "class-validator";
import { PartialType } from "@nestjs/mapped-types";

export class CreateUserDto {
    @IsEmail()
    email: string;

    @IsString()
    name: string;

    @IsInt()
    age: number;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}