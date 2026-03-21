import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { GeneralQueryDto } from "@/interfaces/dtos/common/query";
import { UserSubscriptionStatusEnum } from "@/core";

export class GetUserSubscriptionsRequestDto extends GeneralQueryDto {
  @ApiPropertyOptional({
    description: "Filter by subscription id",
    example: "550e8400-e29b-41d4-a716-446655440001",
  })
  @IsOptional()
  @IsUUID()
  subscriptionId?: string;

  @ApiPropertyOptional({
    enum: UserSubscriptionStatusEnum,
    description: "Filter by status",
  })
  @IsOptional()
  @IsEnum(UserSubscriptionStatusEnum)
  status?: UserSubscriptionStatusEnum;
}
