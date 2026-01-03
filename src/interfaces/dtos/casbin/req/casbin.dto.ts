import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsEnum, IsOptional } from "class-validator";
import { DomainTypeEnum } from "@/core/entities";
import { GeneralQueryDto } from "../../common/query";
import { PtypeEnum } from "@/common/constants/roles";

export class AddPolicyDto {
  @ApiProperty({ description: "Subject (role or user)" })
  @IsString()
  @IsOptional()
  subject: string;

  @ApiProperty({ description: "Object (resource)" })
  @IsString()
  @IsOptional()
  object: string;

  @ApiProperty({ description: "Action (e.g., GET, POST, PUT, DELETE)" })
  @IsString()
  @IsOptional()
  action: string;

  @ApiProperty({
    description: "Effect (allow or deny)",
    required: false,
    default: "allow",
  })
  @IsOptional()
  @IsString()
  effect?: string = "allow";
}

export class AddPolicy2Dto {
  @ApiProperty({ description: "Subject (role or user)" })
  @IsString()
  @IsOptional()
  subject: string;

  @ApiProperty({
    enum: DomainTypeEnum,
    description: "Domain type",
    example: "org",
  })
  @IsEnum(DomainTypeEnum)
  @IsOptional()
  domainType: DomainTypeEnum;

  @ApiProperty({ description: "Object (resource)" })
  @IsString()
  @IsOptional()
  object: string;

  @ApiProperty({ description: "Action (e.g., GET, POST, PUT, DELETE)" })
  @IsString()
  @IsOptional()
  action: string;

  @ApiProperty({
    description: "Effect (allow or deny)",
    required: false,
    default: "allow",
  })
  @IsOptional()
  @IsString()
  effect?: string = "allow";
}

export class RemovePolicyDto {
  @ApiProperty({ description: "Policy ID" })
  @IsString()
  @IsOptional()
  ptype: PtypeEnum;

  @ApiProperty({ description: "Subject (role or user)" })
  @IsString()
  @IsOptional()
  subject: string;

  @ApiProperty({ description: "Object (resource)" })
  @IsString()
  @IsOptional()
  object: string;

  @ApiProperty({ description: "Action (e.g., GET, POST, PUT, DELETE)" })
  @IsString()
  @IsOptional()
  action: string;

  @ApiProperty({
    description: "Effect (allow or deny)",
    required: false,
    default: "allow",
  })
  @IsOptional()
  @IsString()
  effect?: string = "allow";
}

export class RemovePolicy2Dto {
  @ApiProperty({ description: "Subject (role or user)" })
  @IsString()
  @IsOptional()
  subject: string;

  @ApiProperty({
    enum: DomainTypeEnum,
    description: "Domain type",
    example: "company",
  })
  @IsEnum(DomainTypeEnum)
  @IsOptional()
  domainType: DomainTypeEnum;

  @ApiProperty({ description: "Object (resource)" })
  @IsString()
  @IsOptional()
  object: string;

  @ApiProperty({ description: "Action (e.g., GET, POST, PUT, DELETE)" })
  @IsString()
  @IsOptional()
  action: string;

  @ApiProperty({
    description: "Effect (allow or deny)",
    required: false,
    default: "allow",
  })
  @IsOptional()
  @IsString()
  effect?: string = "allow";
}

export class AddRoleDto {
  @ApiProperty({ description: "User ID" })
  @IsString()
  @IsOptional()
  user: string;

  @ApiProperty({ description: "Role name" })
  @IsString()
  role: string;
}

export class AddRoleInDomainDto {
  @ApiProperty({ description: "User ID" })
  @IsString()
  @IsOptional()
  user: string;

  @ApiProperty({ description: "Role name" })
  @IsString()
  @IsOptional()
  role: string;

  @ApiProperty({ description: "Domain ID" })
  @IsString()
  @IsOptional()
  domainId: string;
}

export class RemoveRoleDto {
  @ApiProperty({ description: "User ID" })
  @IsString()
  @IsOptional()
  user: string;

  @ApiProperty({ description: "Role name" })
  @IsString()
  @IsOptional()
  role: string;
}

export class RemoveRoleInDomainDto {
  @ApiProperty({ description: "User ID" })
  @IsString()
  @IsOptional()
  user: string;

  @ApiProperty({ description: "Role name" })
  @IsString()
  @IsOptional()
  role: string;

  @ApiProperty({ description: "Domain ID" })
  @IsString()
  @IsOptional()
  domainId: string;
}

export class CheckPermissionDto {
  @ApiProperty({ description: "Subject (role or user)" })
  @IsString()
  @IsOptional()
  subject: string;

  @ApiProperty({ description: "Object (resource)" })
  @IsString()
  @IsOptional()
  object: string;

  @ApiProperty({ description: "Action (e.g., GET, POST, PUT, DELETE)" })
  @IsString()
  @IsOptional()
  action: string;
}

export class CheckPermissionWithDomainDto {
  @ApiProperty({ description: "Subject (role or user)" })
  @IsString()
  @IsOptional()
  subject: string;

  @ApiProperty({
    enum: DomainTypeEnum,
    description: "Domain type",
    example: "org",
  })
  @IsEnum(DomainTypeEnum)
  @IsOptional()
  domainType: DomainTypeEnum;

  @ApiProperty({ description: "Domain ID" })
  @IsString()
  @IsOptional()
  domainId: string;

  @ApiProperty({ description: "Object (resource)" })
  @IsString()
  @IsOptional()
  object: string;

  @ApiProperty({ description: "Action (e.g., GET, POST, PUT, DELETE)" })
  @IsString()
  @IsOptional()
  action: string;
}

export class GetPoliciesCasbinFilter extends GeneralQueryDto {
  @ApiProperty({ description: "Policy type", enum: PtypeEnum, example: "p" })
  @IsEnum(PtypeEnum)
  @IsOptional()
  ptype?: PtypeEnum;

  @ApiProperty({
    description: "Domain type",
    enum: DomainTypeEnum,
    example: "org",
    required: false,
  })
  @IsEnum(DomainTypeEnum)
  @IsOptional()
  domainType?: DomainTypeEnum;

  @ApiProperty({ description: "Subject (role or user)", required: false })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiProperty({ description: "Object (resource)", required: false })
  @IsString()
  @IsOptional()
  object?: string;
}
