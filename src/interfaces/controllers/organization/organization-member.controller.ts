import { JwtAuthGuard } from "@/frameworks/auth-services/guards";
import { ApiResponseDto } from "@/interfaces/dtos";
import { OrganizationMemberUseCase } from "@/use-cases/organization-member/organization-member.use-case";
import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import {
  ApiOperation,
  ApiResetContentResponse,
  ApiTags,
} from "@nestjs/swagger";

@ApiTags("Organization Members")
@Controller("organizations/:organizationId/members")
export class OrganizationController {
  constructor(
    private readonly organizationMemberUseCase: OrganizationMemberUseCase,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post("/")
  @ApiOperation({
    summary: "Add a member to an organization",
    description: "Add a member to an organization",
  })
  @ApiResponseDto(Boolean)
  async addMember(
    @Param("organizationId") _organizationId: string,
    @Body() _body: any,
  ) {
    // return this.organizationMemberUseCase.addMember(organizationId, body);
  }

  @UseGuards(JwtAuthGuard)
  @ApiResetContentResponse({
    description: "Remove a member from an organization",
  })
  @Post("/remove")
  @ApiOperation({
    summary: "Remove a member from an organization",
    description: "Remove a member from an organization",
  })
  @ApiResponseDto(Boolean)
  async removeMember(
    @Param("organizationId") _organizationId: string,
    @Body() _body: any,
  ) {
    // return this.organizationMemberUseCase.removeMember(organizationId, body);
  }
}
