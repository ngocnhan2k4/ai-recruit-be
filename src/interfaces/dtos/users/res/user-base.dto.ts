import { ApiProperty } from "@nestjs/swagger";
import { RoleEnum } from "@/common/constants/roles";
import { GenderEnum, ProviderEnum, UserStatusEnum } from "@/core";

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

  @ApiProperty({ nullable: false, enum: RoleEnum })
  roles: RoleEnum[];

  @ApiProperty({ type: "boolean" })
  onboardingCompleted: boolean;

  @ApiProperty({ nullable: false, enum: UserStatusEnum })
  status: UserStatusEnum;

  @ApiProperty({ nullable: false })
  deletedAt: Date | null;
}
