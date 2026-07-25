import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  IAIService,
  ICandidateBriefRepository,
  ICvRepository,
  IJobRepository,
  type CandidateBriefAiRequest,
  type CandidateBriefLocale,
  type CandidateBriefView,
} from "@/core";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants/response";
import type { ApiResponse } from "@/interfaces/dtos/common/api-response.dto";
import { buildCandidateBriefFingerprint } from "./candidate-brief-fingerprint";

interface CandidateBriefContext {
  request: Omit<CandidateBriefAiRequest, "locale">;
  fingerprint: string;
}

@Injectable()
export class CandidateBriefUseCase {
  constructor(
    private readonly repository: ICandidateBriefRepository,
    private readonly jobRepository: IJobRepository,
    private readonly cvRepository: ICvRepository,
    private readonly aiService: IAIService,
  ) {}

  async get(
    organizationId: string,
    applicationId: string,
  ): Promise<ApiResponse<CandidateBriefView>> {
    const context = await this.loadContext(organizationId, applicationId);
    const brief = await this.repository.findActive(
      applicationId,
      organizationId,
    );

    return this.success({
      brief,
      isStale: Boolean(brief && brief.inputFingerprint !== context.fingerprint),
    });
  }

  async generate(
    organizationId: string,
    applicationId: string,
    createdBy: string,
    locale: CandidateBriefLocale,
  ): Promise<ApiResponse<CandidateBriefView>> {
    const context = await this.loadContext(organizationId, applicationId);
    const analysis = await this.aiService.runCandidateBrief({
      ...context.request,
      locale,
    });

    const brief = await this.repository.save(
      applicationId,
      organizationId,
      createdBy,
      analysis,
      context.fingerprint,
    );

    return this.success({ brief, isStale: false });
  }

  private async loadContext(
    organizationId: string,
    applicationId: string,
  ): Promise<CandidateBriefContext> {
    const application = await this.jobRepository.getApplyJobById(applicationId);
    if (!application) {
      throw new NotFoundException({
        message: "Application not found",
        code: RESPONSE_CODE.APPLICATION_NOT_FOUND,
      });
    }

    const jobDetail = await this.jobRepository.getFullJobById(
      application.jobId,
    );

    if (!jobDetail?.job || jobDetail.job.deletedAt) {
      throw new NotFoundException({
        message: RESPONSE_MESSAGE.JOB_NOT_FOUND,
        code: RESPONSE_CODE.JOB_NOT_FOUND,
      });
    }

    if (jobDetail.job.organizationId !== organizationId) {
      throw new ForbiddenException({
        message: "You do not have permission to access this application.",
        code: RESPONSE_CODE.FORBIDDEN,
      });
    }

    if (!application.cvId) {
      throw new BadRequestException({
        message: "Application does not have a CV.",
        code: RESPONSE_CODE.CV_REQUIRED_FOR_JOB,
      });
    }

    const cv = await this.cvRepository.get(application.cvId);
    if (!cv || cv.deletedAt) {
      throw new NotFoundException({
        message: "CV not found",
        code: RESPONSE_CODE.CV_REQUIRED_FOR_JOB,
      });
    }

    const jobDescription =
      typeof jobDetail.job.description === "string"
        ? jobDetail.job.description
        : JSON.stringify(jobDetail.job.description ?? {});

    const matchingScore =
      application.matchingScore == null
        ? null
        : Number(application.matchingScore);

    const request: Omit<CandidateBriefAiRequest, "locale"> = {
      cvUrl: cv.fileUrl,
      job: {
        title: jobDetail.job.title,
        description: jobDescription,
        requirements: "",
        benefits: "",
        skills: (jobDetail.skills ?? []).map((skill) => skill.name),
        locations: (jobDetail.provinces ?? []).map((province) => province.name),
        experienceMin: jobDetail.job.experienceMin,
        experienceMax: jobDetail.job.experienceMax,
        salaryMin: this.toNumber(jobDetail.job.salaryMin),
        salaryMax: this.toNumber(jobDetail.job.salaryMax),
        workType: jobDetail.job.workType,
      },
      matchingScore: Number.isFinite(matchingScore) ? matchingScore : null,
      matchingCriteria:
        (application.matchingCriteria as Record<string, unknown> | null) ?? {},
      answers: application.answers ?? [],
    };

    const sourceState = {
      job: {
        id: jobDetail.job.id,
        updatedAt: jobDetail.job.updatedAt,
        ...request.job,
      },
      cv: {
        id: cv.id,
        updatedAt: cv.updatedAt,
        fileUrl: cv.fileUrl,
      },
      matchingScore: request.matchingScore,
      matchingCriteria: request.matchingCriteria,
      answers: request.answers,
    };

    return {
      request,
      fingerprint: buildCandidateBriefFingerprint(sourceState),
    };
  }

  private toNumber(value: string | number | null | undefined): number | null {
    if (value == null) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private success<T>(data: T): ApiResponse<T> {
    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data,
    };
  }
}
