import { JwtAuthGuard } from "@/frameworks/auth-services/guards";
import { ApiResponseDto } from "@/interfaces/dtos";
import {
  GetMemberQueryDto,
  UpdateMemberRoleDto,
} from "@/interfaces/dtos/organization/organization-member.dto";
import { OrganizationMemberUseCase } from "@/use-cases/organization-member/organization-member.use-case";
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

@UseGuards(JwtAuthGuard)
@ApiTags("Organization Members")
@Controller("organizations/:organizationId/members")
export class OrganizationMemberController {
  constructor(
    private readonly organizationMemberUseCase: OrganizationMemberUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Get members of an organization",
    description:
      "Retrieve a list of members belonging to a specific organization",
  })
  async getOrganizationMembers(
    @Param("organizationId") organizationId: string,
    @Query() query: GetMemberQueryDto,
  ) {
    console.log("query", query);
    return this.organizationMemberUseCase.getMembersByOrganizationId(
      organizationId,
      query,
    );
  }

  @Post("delete")
  @ApiOperation({
    summary: "Delete a member from an organization",
    description: "Remove a member from a specific organization",
  })
  async deleteMember(
    @Param("organizationId") organizationId: string,
    @Body() body: { userId: string },
  ) {
    return this.organizationMemberUseCase.deleteMember(
      organizationId,
      body.userId,
    );
  }

  @Put("update-role")
  @ApiOperation({
    summary: "Update a member's role in an organization",
    description: "Update the role of a member within a specific organization",
  })
  @ApiResponseDto(UpdateMemberRoleDto)
  async updateMemberRole(
    @Param("organizationId") organizationId: string,
    @Body() data: UpdateMemberRoleDto,
  ) {
    return await this.organizationMemberUseCase.updateMemberRole(
      organizationId,
      data,
    );
  }
}
