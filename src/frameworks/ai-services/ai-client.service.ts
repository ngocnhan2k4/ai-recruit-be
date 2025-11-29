import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { IAIService } from "@/core/abstracts";
import {
  PreviewRoadmapResponse,
  RoadmapGenerateRequest,
} from "@/core/entities/learning-path.entity";
import { firstValueFrom, retry, timeout, catchError, map } from "rxjs";
import { AxiosError } from "axios";
import { OptimizeAtsResponseDto } from "@/interfaces/dtos/cv/optimize-ats.dto";
import { CvLanguageEnum } from "@/core";

@Injectable()
export class AIClientService implements IAIService {
  private readonly aiServiceUrl: string;
  private readonly aiServiceTimeout: number;
  private readonly maxRetries: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.aiServiceUrl =
      this.configService.get<string>("AI_SERVICE_URL") ||
      "http://localhost:8001";

    this.aiServiceTimeout =
      this.configService.get<number>("AI_SERVICE_TIMEOUT") || 30000;

    this.maxRetries =
      this.configService.get<number>("AI_SERVICE_MAX_RETRIES") || 3;
  }

  async generateRoadmap(
    request: RoadmapGenerateRequest,
  ): Promise<PreviewRoadmapResponse> {
    const url = `${this.aiServiceUrl}/api/v1/generate-roadmap`;

    const response$ = this.httpService
      .post<PreviewRoadmapResponse>(url, request, {
        headers: {
          "Content-Type": "application/json",
        },
      })
      .pipe(
        timeout(this.aiServiceTimeout),
        retry({
          count: this.maxRetries,
          delay: (error, retryCount) => {
            const delayMs = 1000 * Math.pow(2, retryCount);
            return new Promise((resolve) => setTimeout(resolve, delayMs));
          },
          resetOnSuccess: true,
        }),
        catchError((error: AxiosError) => {
          throw new Error(`AI Service request failed: ${error.message}`);
        }),
      );

    const response = await firstValueFrom(response$);

    return response.data;
  }

  // Optimize CV for ATS compatibility
  async optimizeCvAts(params: {
    cvText: string;
    jobDescription: string;
    language?: CvLanguageEnum;
  }): Promise<OptimizeAtsResponseDto> {
    const url = `${this.aiServiceUrl}/api/v1/optimize-cv-ats`;

    return firstValueFrom(
      this.httpService
        .post<OptimizeAtsResponseDto>(url, {
          cv_text: params.cvText,
          job_description: params.jobDescription,
          language: params.language || CvLanguageEnum.VIETNAMESE,
        })
        .pipe(
          timeout(this.aiServiceTimeout),
          retry({
            count: this.maxRetries,
            delay: (_, retryCount) => {
              const delayMs = Math.min(1000 * Math.pow(2, retryCount), 10000);
              return new Promise((resolve) => setTimeout(resolve, delayMs));
            },
            resetOnSuccess: true,
          }),
          catchError((error: AxiosError) => {
            const errorData = error.response?.data as any;
            const errorMsg = errorData?.detail || error.message;

            throw new Error(`AI Service CV optimization failed: ${errorMsg}`);
          }),
          map((response) => response.data),
        ),
    );
  }
}
