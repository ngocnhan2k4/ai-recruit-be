import { ApiProperty } from "@nestjs/swagger";
import { ArrayMinSize, IsArray, IsInt, IsPositive } from "class-validator";

export class UpsertSubscriptionFeaturesItemDto {
  @ApiProperty({ example: 1, description: "Feature ID" })
  @IsInt()
  @IsPositive()
  featureId: number;

  @ApiProperty({
    example: 10,
    description: "Monthly usage limit (0 means disabled)",
  })
  @IsInt()
  limit: number;
}

export class UpsertSubscriptionFeaturesRequestDto {
  @ApiProperty({ type: [UpsertSubscriptionFeaturesItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  items: UpsertSubscriptionFeaturesItemDto[];
}
