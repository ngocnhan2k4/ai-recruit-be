import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { IAIService } from "@/core/abstracts";
import {
  PreviewRoadmapResponse,
  RoadmapGenerateRequest,
} from "@/core/entities/learning-path.entity";
import { firstValueFrom, retry, timeout, catchError, map } from "rxjs";
import { AxiosError, AxiosResponse } from "axios";

import { OptimizeAtsRequest, OptimizeAtsResponse } from "@/core";

@Injectable()
export class AIClientService implements IAIService {
  private readonly logger = new Logger(AIClientService.name);
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
  async optimizeCvAts(
    request: OptimizeAtsRequest,
  ): Promise<OptimizeAtsResponse> {
    const url = `${this.aiServiceUrl}/api/v1/optimize-cv-ats`;

    return firstValueFrom(
      this.httpService
        .post<OptimizeAtsResponse>(url, request, {
          headers: {
            "Content-Type": "application/json",
          },
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
            let errorMsg: string;

            // Handle different error response formats
            if (typeof errorData?.detail === "string") {
              errorMsg = errorData.detail;
            } else if (Array.isArray(errorData?.detail)) {
              // FastAPI validation errors return array of objects
              errorMsg = errorData.detail
                .map((err: any) => {
                  if (typeof err === "string") return err;
                  if (err.msg)
                    return `${err.loc?.join(".") || "field"}: ${err.msg}`;
                  return JSON.stringify(err);
                })
                .join("; ");
            } else if (errorData?.message) {
              errorMsg = errorData.message;
            } else if (typeof errorData === "string") {
              errorMsg = errorData;
            } else {
              errorMsg = error.message || "Unknown error";
            }

            this.logger.error(
              `AI Service CV optimization failed: ${errorMsg}`,
              error.stack,
            );

            throw new Error(`AI Service CV optimization failed: ${errorMsg}`);
          }),
          map(
            (
              response: AxiosResponse<OptimizeAtsResponse>,
            ): OptimizeAtsResponse => response.data,
          ),
        ),
    );
  }
}
