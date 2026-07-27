import { Injectable } from "@nestjs/common";
import { IAIService } from "../../core/abstracts/ai-services.abstract";
import { ISkillRepository } from "../../core/abstracts/repositories/skill-repository.abstract";
import type {
  JobCopilotRequest,
  JobCopilotResponse,
} from "../../core/entities/job-copilot.entity";
import {
  RESPONSE_CODE,
  RESPONSE_MESSAGE,
} from "../../common/constants/response";
import type { ApiResponse } from "../../interfaces/dtos/common/api-response.dto";

@Injectable()
export class JobCopilotUseCase {
  constructor(
    private readonly aiService: IAIService,
    private readonly skillRepository: ISkillRepository,
  ) {}

  async run(
    request: JobCopilotRequest,
  ): Promise<ApiResponse<JobCopilotResponse>> {
    const workspace = await this.aiService.runJobCopilot(request);
    const suggestedSkills =
      await this.skillRepository.resolveApprovedSkillsByNames(
        workspace.suggestedSkills,
      );
    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: {
        ...workspace,
        suggestedSkills,
      },
    };
  }
}
