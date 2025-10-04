import { IsEmail, IsInt, IsString } from "class-validator";
import { PartialType } from "@nestjs/mapped-types";
import { ApiProperty } from "@nestjs/swagger";
import { Expose, plainToInstance } from "class-transformer";
import { GenderEnum } from "@/common/constants/roles";

export class CreateUserRequestDto {
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

export class UpdateUserRequestDto extends PartialType(CreateUserRequestDto) {}

export class UserPublicResponseDto {
  @ApiProperty()
  username: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  avatarUrl: string | null;

  @ApiProperty({ nullable: true, enum: GenderEnum })
  gender: GenderEnum | null;

  @ApiProperty({ nullable: true })
  dob: string | null;

  @ApiProperty({ nullable: true })
  bio: string | null;
}

export class UserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  username: string;

  @ApiProperty({ nullable: true })
  email: string | null;

  @ApiProperty({ nullable: false })
  phone: string | null;

  @ApiProperty({ nullable: false })
  avatarUrl: string | null;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: false })
  dob: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ nullable: false })
  updatedAt: Date | null;

  @ApiProperty({ nullable: false })
  firebaseUid: string | null;

  @ApiProperty({ nullable: false, enum: GenderEnum })
  gender: GenderEnum | null;

  @ApiProperty({ nullable: false, type: "boolean" })
  emailVerified: boolean | null;
}

export class GetUserResponseDto {
  @Expose()
  id: string;

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
  dob: string | null;

  @Expose()
  gender: string | null;

  @Expose()
  firebaseUid: string | null;

  @Expose()
  emailVerified: boolean;

  //Use this instead of Object.assign to drop non-exposed fields
  static from(partial: Partial<GetUserResponseDto>) {
    return plainToInstance(GetUserResponseDto, partial, {
      excludeExtraneousValues: true,
    });
  }
}

export class CheckUsernameResponseDto {
  @ApiProperty()
  exists: boolean;
}

export class UserAvatarUpdateResponseDto {
  @ApiProperty()
  url: string;

  @ApiProperty()
  publicId: string;

  @ApiProperty()
  format: string;
}
