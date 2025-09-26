import { IsEmail, IsInt, IsString } from "class-validator";
import { PartialType } from "@nestjs/mapped-types";
import { Expose, plainToInstance } from "class-transformer";

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsInt()
  age: number;
}

export class GetUserDto {
  @Expose()
  id: number;

  @Expose()
  username: string;

  @Expose()
  email?: string;
  @Expose()
  phone?: string;
  @Expose()
  avatarUrl?: string;
  @Expose()
  name: string;
  @Expose()
  dob?: Date;
  @Expose()
  gender?: string;
  @Expose()
  firebaseUid?: string;

  //Use this instead of Object.assign to drop non-exposed fields
  static from(partial: Partial<GetUserDto>) {
    return plainToInstance(GetUserDto, partial, {
      excludeExtraneousValues: true,
    });
  }
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}
