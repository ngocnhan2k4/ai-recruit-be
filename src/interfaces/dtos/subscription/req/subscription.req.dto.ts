import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsNumberString, IsOptional } from "class-validator";
import { BillingCycleSubscriptionEnum, SubscriptionEnum } from "@/core";

export class CreateSubscriptionRequestDto {
  @ApiProperty({ example: "PRO" })
  @IsEnum(SubscriptionEnum)
  name: SubscriptionEnum;

  @ApiProperty({
    example: "9.99",
    description: "Numeric string to match DB numeric",
  })
  @IsNumberString()
  price: string;

  @ApiProperty({
    enum: BillingCycleSubscriptionEnum,
    example: BillingCycleSubscriptionEnum.MONTHLY,
  })
  @IsEnum(BillingCycleSubscriptionEnum)
  billingCycle: BillingCycleSubscriptionEnum;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateSubscriptionRequestDto {
  @ApiPropertyOptional({ example: "PRO" })
  @IsOptional()
  @IsEnum(SubscriptionEnum)
  name?: SubscriptionEnum;

  @ApiPropertyOptional({ example: "19.99" })
  @IsOptional()
  @IsNumberString()
  price?: string;

  @ApiPropertyOptional({
    enum: BillingCycleSubscriptionEnum,
    example: BillingCycleSubscriptionEnum.MONTHLY,
  })
  @IsOptional()
  @IsEnum(BillingCycleSubscriptionEnum)
  billingCycle?: BillingCycleSubscriptionEnum;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
