import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
} from "class-validator";
import {
  BillingCycleSubscriptionEnum,
  PaymentProviderEnum,
  SubscriptionEnum,
} from "@/core";
import { GeneralQueryDto } from "../../common";
import { Transform, Type } from "class-transformer";

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

export class SubscriptionFilterDto extends GeneralQueryDto {
  @ApiProperty({ enum: SubscriptionEnum })
  @IsOptional()
  @IsEnum(SubscriptionEnum)
  exactName?: SubscriptionEnum;

  @ApiProperty({ type: "boolean" })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  skipCount?: boolean;

  @ApiProperty({ type: "boolean" })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiProperty()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }: { value: string }) =>
    Array.isArray(value) ? value : [value],
  )
  fields?: string[];
}

export class RegisterUserSubscriptionRequestDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  @IsString()
  subscriptionId: string;

  @ApiProperty({
    enum: PaymentProviderEnum,
    example: PaymentProviderEnum.STRIPE,
  })
  @IsEnum(PaymentProviderEnum)
  provider: PaymentProviderEnum;
}
