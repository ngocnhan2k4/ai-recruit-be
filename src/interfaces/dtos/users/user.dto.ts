import {
  IsEmail,
  IsInt,
  IsString,
  IsOptional,
  IsDateString,
} from "class-validator";
import { PartialType } from "@nestjs/mapped-types";
import { ApiProperty } from "@nestjs/swagger";

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsInt()
  age: number;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}

export class UserProfileDto {
  @ApiProperty()
  @IsInt()
  id: number;

  @ApiProperty()
  @IsString()
  username: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dob?: Date;

  @ApiProperty()
  @IsDateString()
  createdAt: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  updatedAt?: Date;
}

export class UserPublicDto {
  @ApiProperty()
  @IsString()
  username: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  avatarUrl?: string;

  @ApiProperty()
  @IsString()
  bio?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  location?: string;
}
