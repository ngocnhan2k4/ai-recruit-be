import { ApiProperty, PickType } from "@nestjs/swagger";
import { Expose, plainToInstance } from "class-transformer";
import { RoleEnum } from "@/common/constants";
import { GenderEnum, ProviderEnum } from "@/core";
import { UserDto } from "./user-base.dto";

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

  @ApiProperty({ nullable: true, type: String })
  school: string | null;

  // Private fields - only returned when user views their own profile
  @ApiProperty({ required: false, type: [String], nullable: true })
  provinceIds?: string[];

  @ApiProperty({ required: false, type: [String], nullable: true })
  categoryIds?: string[];

  @ApiProperty({ required: false, type: Number, nullable: true })
  expectedSalary?: number | null;

  @ApiProperty({ required: false, type: Number, nullable: true })
  experienceYears?: number | null;

  @ApiProperty({ required: false, type: String, nullable: true })
  currentGoal?: string | null;

  @ApiProperty({ required: false, type: () => [String], nullable: true })
  skills?: { id: string; name: string }[];

  @ApiProperty({ required: false, type: String, nullable: true })
  email?: string | null;

  @ApiProperty({ required: false, type: String, nullable: true })
  phone?: string | null;
}

export class UserSeoPublicResponseDto {
  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true, type: String })
  avatarUrl: string | null;
}

export class UserLoginMethodDto {
  @Expose()
  @ApiProperty({ enum: ProviderEnum })
  provider: ProviderEnum;

  @Expose()
  @ApiProperty({ required: false, nullable: true, type: String })
  providerUserId?: string | null;

  @Expose()
  @ApiProperty({ required: false, nullable: true, type: String })
  providerEmail?: string | null;

  @Expose()
  @ApiProperty({ required: false, nullable: true, type: String })
  providerName?: string | null;

  @Expose()
  @ApiProperty({ required: false, nullable: true, type: String })
  providerPicture?: string | null;

  @Expose()
  @ApiProperty({ type: String, format: "date-time" })
  createdAt: Date;
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
  roles: RoleEnum[];

  @Expose()
  provider: ProviderEnum;

  @Expose()
  @ApiProperty({
    required: false,
    type: () => UserLoginMethodDto,
    isArray: true,
  })
  otherProviders?: UserLoginMethodDto[];

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

export class GetAllUserResponseDto extends PickType(UserDto, [
  "id",
  "email",
  "name",
  "username",
  "emailVerified",
  "phone",
  "phoneVerified",
  "roles",
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
