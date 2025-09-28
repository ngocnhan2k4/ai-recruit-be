import { IsEmail, IsInt, IsString } from "class-validator";
import { PartialType } from "@nestjs/mapped-types";
import { ApiProperty } from "@nestjs/swagger";
import { GenderEnum } from "@/common/constants/roles";

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsInt()
  age: number;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}

export class UserPublicDto {
  @ApiProperty()
  username: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  avatarUrl?: string;

  @ApiProperty()
  gender?: GenderEnum;
}

export class UserDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  username: string;

  @ApiProperty({ required: false })
  email?: string;

  @ApiProperty({ required: false })
  phone?: string;

  @ApiProperty({ required: false })
  avatarUrl?: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  dob?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ required: false })
  updatedAt?: Date;

  @ApiProperty({ required: false })
  firebaseUid?: string;

  @ApiProperty({ required: false, enum: GenderEnum })
  gender?: GenderEnum;

  @ApiProperty({ required: false, type: "boolean" })
  emailVerified?: boolean;
}
