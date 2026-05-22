import { Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { ApiResponse } from "@/interfaces/dtos";
import {
  JwtAuthGuard,
  SystemAuthorizeGuard,
} from "@/frameworks/auth-services/guards";
import type { DeployResult } from "@/use-cases/deployment/deployment.use-case";
import { DeploymentUseCases } from "@/use-cases/deployment/deployment.use-case";

@ApiTags("Deployment Admin")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SystemAuthorizeGuard)
@Controller("admin/deployment")
export class AdminDeploymentController {
  constructor(private readonly deploymentUseCases: DeploymentUseCases) {}

  @ApiOperation({
    summary: "Redeploy backend service",
    description:
      "Pull the latest image and restart the configured service via SSH.",
  })
  @Post("redeploy")
  async redeployService(): Promise<ApiResponse<DeployResult>> {
    return this.deploymentUseCases.redeployService();
  }
}
