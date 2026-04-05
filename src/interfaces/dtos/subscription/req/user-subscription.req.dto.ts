import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsEnum, IsOptional, IsUUID } from "class-validator";
import { UserSubscriptionStatusEnum } from "@/core";

export class UpdateUserSubscriptionRequestDto {
  @ApiPropertyOptional({
    description: "Update to subscription id",
    example: "550e8400-e29b-41d4-a716-446655440001",
  })
  @IsOptional()
  @IsUUID()
  subscriptionId?: string;

  @ApiPropertyOptional({
    enum: UserSubscriptionStatusEnum,
    description: "Update user subscription status",
  })
  @IsOptional()
  @IsEnum(UserSubscriptionStatusEnum)
  status?: UserSubscriptionStatusEnum;

  @ApiPropertyOptional({
    description: "Expired date time in ISO string",
    example: "2026-04-21T10:30:00.000Z",
  })
  @IsOptional()
  @IsDateString()
  expiredAt?: string;
}
