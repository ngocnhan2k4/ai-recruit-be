import { IsEmail, IsInt, IsString } from "class-validator";
import { PartialType } from "@nestjs/mapped-types";
import { ApiProperty } from "@nestjs/swagger";
import { Expose, plainToInstance } from "class-transformer";
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
  avatarUrl: string | null;

  @ApiProperty()
  gender: GenderEnum | null;

  @ApiProperty()
  dob: Date | null;
}

export class UserDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  username: string;

  @ApiProperty({ required: false })
  email: string | null;

  @ApiProperty({ required: false })
  phone: string | null;

  @ApiProperty({ required: false })
  avatarUrl: string | null;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  dob: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ required: false })
  updatedAt: Date | null;

  @ApiProperty({ required: false })
  firebaseUid: string | null;

  @ApiProperty({ required: false, enum: GenderEnum })
  gender: GenderEnum | null;

  @ApiProperty({ required: false, type: "boolean" })
  emailVerified: boolean | null;
}

export class GetUserDto {
  @Expose()
  id: number;

  @Expose()
  username: string;

  @Expose()
  email: string | null;
  @Expose()
  phone: string | null;
  @Expose()
  avatarUrl: string | null;
  @Expose()
  name: string;
  @Expose()
  dob: Date | null;
  @Expose()
  gender: string | null;
  @Expose()
  firebaseUid: string | null;
  @Expose()
  emailVerified: boolean;

  //Use this instead of Object.assign to drop non-exposed fields
  static from(partial: Partial<GetUserDto>) {
    return plainToInstance(GetUserDto, partial, {
      excludeExtraneousValues: true,
    });
  }
}
