import { ApiProperty } from "@nestjs/swagger";

export class OrganizationOverviewStatsDto {
  @ApiProperty({ example: 5, description: "Total active open job postings" })
  activeJobsCount: number;

  @ApiProperty({
    example: 10,
    description: "Total active organization members",
  })
  totalMembersCount: number;
}
