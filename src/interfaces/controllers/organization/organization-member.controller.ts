import { GetUser } from "@/common/decorators";
import type { TokenPayload } from "@/common/types";
import {
  JwtAuthGuard,
  OrganizationAuthorizeGuard,
} from "@/frameworks/auth-services/guards";
import { ApiResponse, ApiResponseDto } from "@/interfaces/dtos";
import { GetMemberQueryDto, UpdateMemberRoleDto } from "@/interfaces/dtos";
import { OrganizationMemberUseCase } from "@/use-cases/organization-member/organization-member.use-case";
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

@UseGuards(JwtAuthGuard)
@ApiTags("Organization Members")
@Controller("organizations/:orgId/members")
export class OrganizationMemberController {
  constructor(
    private readonly organizationMemberUseCase: OrganizationMemberUseCase,
  ) {}

  @UseGuards(OrganizationAuthorizeGuard)
  @Get()
  @ApiOperation({
    summary: "Get members of an organization",
    description:
      "Retrieve a list of members belonging to a specific organization",
  })
  async getOrganizationMembers(
    @GetUser() user: TokenPayload,
    @Param("orgId") organizationId: string,
    @Query() query: GetMemberQueryDto,
  ) {
    return this.organizationMemberUseCase.getMembersByOrganizationId(
      organizationId,
      query,
      user?.userId,
    );
  }

  @UseGuards(OrganizationAuthorizeGuard)
  @Post("delete")
  @ApiOperation({
    summary: "Delete a member from an organization",
    description: "Remove a member from a specific organization",
  })
  async deleteMember(
    @GetUser() user: TokenPayload,
    @Param("orgId") organizationId: string,
    @Body() body: { userId: string },
  ) {
    return this.organizationMemberUseCase.deleteMember(
      organizationId,
      body.userId,
      user.userId,
    );
  }

  @UseGuards(OrganizationAuthorizeGuard)
  @Post("kick-member")
  @ApiOperation({
    summary: "Kick a member from an organization",
    description: "Kick a member out of a specific organization",
  })
  async kickMember(
    @GetUser() user: TokenPayload,
    @Param("orgId") orgId: string,
    @Body() data: { kickedMemberId: string },
  ): Promise<ApiResponse<void>> {
    return this.organizationMemberUseCase.kickMember(
      orgId,
      user.userId,
      data.kickedMemberId,
    );
  }

  @UseGuards(OrganizationAuthorizeGuard)
  @Patch(":userId/role")
  @ApiOperation({
    summary: "Update a member's role in an organization",
    description: "Update the role of a member within a specific organization",
  })
  @ApiResponseDto(UpdateMemberRoleDto)
  async updateMemberRole(
    @GetUser() user: TokenPayload,
    @Param("orgId") organizationId: string,
    @Param("userId") userId: string,
    @Body() data: { role: string },
  ) {
    return await this.organizationMemberUseCase.updateMemberRole(
      user.userId,
      organizationId,
      {
        userId: userId,
        role: data.role as any,
      },
    );
  }
}
