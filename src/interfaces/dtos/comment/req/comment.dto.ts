import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { GeneralQueryDto } from "../../common/query";
import { ObjectType } from "@/core/entities";

export class QueryCommentsDto extends GeneralQueryDto {
  @ApiProperty({ description: "ID of the object being commented on" })
  @IsNotEmpty()
  @IsString()
  objectId: string;

  @ApiProperty({ enum: ObjectType, description: "Type of the object" })
  @IsNotEmpty()
  @IsEnum(ObjectType)
  objectType: ObjectType;

  @ApiPropertyOptional({
    description: "ID of the parent comment (for replies)",
  })
  @IsOptional()
  @IsString()
  parentId?: string;
}

export class CreateCommentDto {
  @ApiProperty({ description: "ID of the object being commented on" })
  @IsNotEmpty()
  @IsString()
  objectId: string;

  @ApiProperty({ enum: ObjectType, description: "Type of the object" })
  @IsNotEmpty()
  @IsEnum(ObjectType)
  objectType: ObjectType;

  @ApiProperty({ description: "Comment content" })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiPropertyOptional({
    description: "ID of the parent comment (for replies)",
  })
  @IsOptional()
  @IsString()
  parentId?: string;
}
