import { ApiProperty } from "@nestjs/swagger";

export class SkillDto {
  @ApiProperty({ type: "string", format: "uuid" })
  id: string;

  @ApiProperty({ type: "string" })
  name: string;
}

export class CrawledSkillDto {
  @ApiProperty({ type: "string", format: "uuid" })
  id: string;

  @ApiProperty({ type: "string" })
  name: string;

  @ApiProperty({ type: "string", nullable: true })
  synonym: string | null;

  @ApiProperty({ type: "string", format: "date-time" })
  createdAt: Date;
}
