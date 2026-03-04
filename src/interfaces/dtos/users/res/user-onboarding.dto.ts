import { ApiProperty } from "@nestjs/swagger";

export class UserOnboardingStatusDto {
  @ApiProperty()
  isOnboarded: boolean;
}
