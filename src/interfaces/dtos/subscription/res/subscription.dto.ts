import { ApiProperty } from "@nestjs/swagger";
import { BillingCycleSubscriptionEnum, SubscriptionEnum } from "@/core";

export class SubscriptionDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  id: string;

  @ApiProperty({ example: "PRO" })
  name: SubscriptionEnum;

  @ApiProperty({ example: "9.99" })
  price: string;

  @ApiProperty({
    enum: BillingCycleSubscriptionEnum,
    example: BillingCycleSubscriptionEnum.MONTHLY,
  })
  billingCycle: BillingCycleSubscriptionEnum;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ required: false, nullable: true })
  updatedAt: Date | null;
}

export class RegisterUserSubscriptionResponseDto {
  @ApiProperty({ example: "https://example.com/payment" })
  paymentUrl: string;

  @ApiProperty({ example: "https://example.com/qr" })
  qrUrl: string;
}
