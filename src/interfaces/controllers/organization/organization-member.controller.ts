import { GetUser } from "@/common/decorators/get-user.decorator";
import type { TokenPayload } from "@/common/types/token";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards";
import { ApiResponse, ApiResponseDto } from "@/interfaces/dtos";
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

  @Post("kick-member")
  @ApiOperation({
    summary: "Kick a member from an organization",
    description: "Kick a member out of a specific organization",
  })
  async kickMember(
    @GetUser() user: TokenPayload,
    @Param("organizationId") orgId: string,
    @Body() data: { kickedMemberId: string },
  ): Promise<ApiResponse<void>> {
    return this.organizationMemberUseCase.kickMember(
      orgId,
      user.userId,
      data.kickedMemberId,
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
