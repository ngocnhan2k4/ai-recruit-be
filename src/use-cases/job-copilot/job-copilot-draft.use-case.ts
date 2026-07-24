import { ConflictException, Injectable } from "@nestjs/common";
import { IJobCopilotDraftRepository } from "../../core/abstracts/repositories/job-copilot-draft-repository.abstract";
import type {
  JobCopilotDraftRecord,
  SaveJobCopilotDraft,
} from "../../core/entities/job-copilot-draft.entity";
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
  ): Promise<ApiResponse<JobCopilotDraftRecord | null>> {
    const draft = await this.repository.findActive(organizationId, userId);
    return this.success(draft);
  }

  async save(
    organizationId: string,
    userId: string,
    input: SaveJobCopilotDraft,
  ): Promise<ApiResponse<JobCopilotDraftRecord>> {
    const draft = await this.repository.save(organizationId, userId, input);
    if (!draft) {
      throw new ConflictException(
        "Bản nháp đã được cập nhật ở nơi khác. Vui lòng tải lại dữ liệu.",
      );
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
