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

export class UpdateUserDto extends PartialType(CreateUserDto) { }

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

export class CreateUserExperienceDto {
  @ApiProperty()
  @IsString()
  companyId: string;

  @ApiProperty()
  @IsString()
  userId: number;

  @ApiProperty()
  @IsString()
  jobTitle: string;

  @ApiProperty()
  @IsString()
  position: string;

  @ApiProperty()
  @IsString()
  startDate: Date;

  @ApiProperty()
  @IsString()
  endDate: Date;

  @ApiProperty()
  @IsString()
  description: string;
}

export class UpdateUserExperienceDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  userId: number;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsString()
  startDate: Date;

  @ApiProperty()
  @IsString()
  endDate: Date;

  @ApiProperty()
  @IsString()
  position: string;

  @ApiProperty()
  @IsString()
  jobTitle: string;

  @ApiProperty()
  @IsString()
  companyId: string;
}

export class CreateUserSkillDto {
  @ApiProperty()
  @IsString()
  skillId: string;
}

export class UpdateUserSkillDto {
  @ApiProperty()
  @IsString()
  skillId: string;
}