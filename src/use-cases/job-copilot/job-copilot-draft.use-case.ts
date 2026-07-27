import { ConflictException, Injectable } from "@nestjs/common";
import { IJobCopilotDraftRepository } from "../../core/abstracts/repositories/job-copilot-draft-repository.abstract";
import type {
  JobCopilotDraftRecord,
  SaveJobCopilotDraft,
} from "../../core/entities/job-copilot-draft.entity";
import type { JobCopilotLocale } from "../../core/entities/job-copilot.entity";
import {
  RESPONSE_CODE,
  RESPONSE_MESSAGE,
} from "../../common/constants/response";
import type { ApiResponse } from "../../interfaces/dtos/common/api-response.dto";

@Injectable()
export class JobCopilotDraftUseCase {
  constructor(private readonly repository: IJobCopilotDraftRepository) {}

  async get(
    organizationId: string,
    userId: string,
    locale: JobCopilotLocale,
  ): Promise<ApiResponse<JobCopilotDraftRecord | null>> {
    const draft = await this.repository.findActive(
      organizationId,
      userId,
      locale,
    );
    return this.success(draft);
  }

  async save(
    organizationId: string,
    userId: string,
    input: SaveJobCopilotDraft,
  ): Promise<ApiResponse<JobCopilotDraftRecord>> {
    const draft = await this.repository.save(organizationId, userId, input);
    if (!draft) {
      throw new ConflictException({
        message: RESPONSE_MESSAGE.JOB_COPILOT_DRAFT_CONFLICT,
        code: RESPONSE_CODE.JOB_COPILOT_DRAFT_CONFLICT,
      });
    }

    return this.success(draft);
  }

  async remove(
    organizationId: string,
    userId: string,
  ): Promise<ApiResponse<{ deleted: boolean }>> {
    const deleted = await this.repository.softDelete(organizationId, userId);
    return this.success({ deleted });
  }

  private success<T>(data: T): ApiResponse<T> {
    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data,
    };
  }
}
