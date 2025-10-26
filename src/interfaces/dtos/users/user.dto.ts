import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
} from "class-validator";
import { ApiProperty, PartialType, PickType } from "@nestjs/swagger";
import { Expose, plainToInstance } from "class-transformer";
import { GenderEnum, RoleEnum } from "@/common/constants/roles";
import { GeneralQueryDto } from "../common/query";
import { ProviderEnum, UserStatusEnum } from "@/core";
export class CreateUserRequestDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  username: string;

  @ApiProperty()
  @IsString()
  bio: string;

  @ApiProperty()
  @IsString()
  phone: string;

  @ApiProperty({ enum: GenderEnum })
  @IsEnum(GenderEnum)
  gender: GenderEnum;
}

export class UpdateUserRequestDto extends PartialType(CreateUserRequestDto) {}

export class UserPublicResponseDto {
  @ApiProperty()
  username: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true, type: String })
  avatarUrl: string | null;

  @ApiProperty({ nullable: true, type: String })
  bannerUrl: string | null;

  @ApiProperty({ nullable: true, enum: GenderEnum })
  gender: GenderEnum | null;

  @ApiProperty({ nullable: true, type: String })
  dob: string | null;

  @ApiProperty({ nullable: true, type: String })
  bio: string | null;

  @ApiProperty({ nullable: true, type: String })
  address: string | null;
}

export class UserSeoPublicResponseDto {
  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true, type: String })
  avatarUrl: string | null;
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

  @ApiProperty({ nullable: false, type: "boolean" })
  phoneVerified: boolean | null;

  @ApiProperty()
  provider: ProviderEnum;

  @ApiProperty({ type: "boolean" })
  onboardingCompleted: boolean;

  @ApiProperty({ nullable: false, enum: UserStatusEnum })
  status: UserStatusEnum;

  @ApiProperty({ nullable: false })
  deletedAt: Date | null;
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

  @Expose()
  provider: ProviderEnum;

  @Expose()
  onboardingCompleted: boolean;

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

export enum TypeAvatar {
  AVATAR = "avatar",
  BANNER = "banner",
}

export class UserAvatarUpdateRequestDto {
  @ApiProperty({ enum: TypeAvatar })
  @IsEnum(TypeAvatar)
  type: TypeAvatar;
}

export class GetUserQueryDto extends GeneralQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isDeleted?: boolean;
}

export class GetAllUserResponseDto extends PickType(UserDto, [
  "id",
  "email",
  "name",
  "username",
  "emailVerified",
  "phone",
  "phoneVerified",
  "status",
  "createdAt",
  "updatedAt",
  "deletedAt",
] as const) {
  static from(partial: Partial<GetAllUserResponseDto>) {
    return plainToInstance(GetAllUserResponseDto, partial, {
      excludeExtraneousValues: true,
    });
  }
}

export class AdminUpdateUserRequestDto {
  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  roles?: RoleEnum[];
}
