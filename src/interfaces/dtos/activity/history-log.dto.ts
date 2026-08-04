import { ApiProperty } from "@nestjs/swagger";

export class AuditMarkDto {
  @ApiProperty({ description: "UTF-16 start index in message" })
  startIndex: number;

  @ApiProperty({ description: "UTF-16 end index in message (exclusive)" })
  endIndex: number;

  @ApiProperty({ type: [String], example: ["bold"] })
  styles: string[];
}

export class HistoryLogDto {
  @ApiProperty()
  message: string;

  @ApiProperty({ type: [AuditMarkDto] })
  marks: AuditMarkDto[];

  @ApiProperty({ description: "Unix ms timestamp" })
  createdAt: number;
}
