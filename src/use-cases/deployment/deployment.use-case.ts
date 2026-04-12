import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SshService } from "@/frameworks/ssh/ssh.service";
import { ApiResponse } from "@/interfaces/dtos";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants";

export interface DeployResult {
  logs: string;
}

@Injectable()
export class DeploymentUseCases {
  private readonly logger = new Logger(DeploymentUseCases.name);

  constructor(
    private readonly sshService: SshService,
    private readonly configService: ConfigService,
  ) {}

  async redeployService(): Promise<ApiResponse<DeployResult>> {
    const host = this.configService.get<string>("DEPLOY_SSH_HOST");
    const port = this.configService.get<number>("DEPLOY_SSH_PORT") ?? 22;
    const username = this.configService.get<string>("DEPLOY_SSH_USER");
    const password = this.configService.get<string>("DEPLOY_SSH_PASSWORD");
    const workdir = this.configService.get<string>("DEPLOY_WORKDIR");
    const composeFile = this.configService.get<string>("DEPLOY_COMPOSE_FILE");
    const serviceName = this.configService.get<string>("DEPLOY_SERVICE_NAME");

    if (
      !host ||
      !username ||
      !password ||
      !workdir ||
      !composeFile ||
      !serviceName
    ) {
      throw new BadRequestException(
        "Deploy config incomplete. Required: DEPLOY_SSH_HOST, DEPLOY_SSH_USER, DEPLOY_SSH_PASSWORD, DEPLOY_WORKDIR, DEPLOY_COMPOSE_FILE, DEPLOY_SERVICE_NAME",
      );
    }

    const command = [
      `cd ${workdir}`,
      `docker compose -f ${composeFile} pull ${serviceName}`,
      `docker compose -f ${composeFile} up -d ${serviceName}`,
    ].join(" && ");

    this.logger.log(`Redeploying ${serviceName} on ${host}`);

    const result = await this.sshService.execCommand(
      { host, port, username, password },
      command,
    );

    if (result.code !== 0) {
      this.logger.error(`Redeploy failed: ${result.stderr}`);
      throw new Error(
        `Redeploy failed with exit code ${result.code}: ${result.stderr || result.stdout}`,
      );
    }

    this.logger.log(`Redeploy successful`);

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: {
        logs: result.stdout + result.stderr,
      },
    };
  }
}
