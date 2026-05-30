import { Injectable, Logger, MessageEvent } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { IAIService } from "@/core/abstracts";
import { RoadmapGenerateRequest } from "@/core/entities/learning-path.entity";
import {
  firstValueFrom,
  retry,
  timeout,
  catchError,
  map,
  Observable,
} from "rxjs";
import { AxiosError, AxiosResponse } from "axios";

import {
  ExtractCvResponse,
  ExtractCvRequest,
  OptimizeAtsRequest,
  OptimizeAtsResponse,
} from "@/core";
import {
  CvFieldSuggestionRequest,
  CvFieldSuggestionResponse,
  GenerateJobBlogPostRequest,
  GenerateJobBlogPostResponse,
} from "@/core";

@Injectable()
export class AIClientService implements IAIService {
  private readonly logger = new Logger(AIClientService.name);
  private readonly aiServiceUrl: string;
  private readonly aiServiceTimeout: number;
  private readonly maxRetries: number;
  private readonly apiKey: string;

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

    this.apiKey = this.configService.get<string>("AI_API_KEY")!;
  }

  private formatAxiosErrorMessage(error: AxiosError): string {
    const errorData = error.response?.data as any;

    if (typeof errorData?.detail === "string") {
      return errorData.detail;
    }

    if (Array.isArray(errorData?.detail)) {
      return errorData.detail
        .map((err: any) => {
          if (typeof err === "string") return err;
          if (err?.msg) return `${err.loc?.join(".") || "field"}: ${err.msg}`;
          return JSON.stringify(err);
        })
        .join("; ");
    }

    if (typeof errorData?.message === "string" && errorData.message.trim()) {
      return errorData.message;
    }

    if (typeof errorData === "string" && errorData.trim()) {
      return errorData;
    }

    return error.message || "Unknown error";
  }

  generateRoadmap(request: RoadmapGenerateRequest): Observable<MessageEvent> {
    const url = `${this.aiServiceUrl}/api/v1/generate-roadmap-stream`;

    return new Observable<MessageEvent>((observer) => {
      const makeRequest = async () => {
        try {
          const response = await firstValueFrom(
            this.httpService.post(url, request, {
              headers: {
                "Content-Type": "application/json",
                "X-API-Key": this.apiKey,
              },
              responseType: "stream",
              timeout: this.aiServiceTimeout,
            }),
          );

          const stream = response.data;
          let buffer = "";

          stream.on("data", (chunk: Buffer) => {
            const chunkStr = chunk.toString();

            buffer += chunkStr;
            const lines = buffer.split("\n");

            // Keep the last incomplete line in the buffer
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6).trim();
                if (data) {
                  try {
                    const parsed = JSON.parse(data);
                    observer.next({ data: parsed } as MessageEvent);
                  } catch {
                    this.logger.warn(`Failed to parse SSE data: ${data}`);
                  }
                }
              }
            }
          });

          stream.on("end", () => {
            observer.complete();
          });

          stream.on("error", (error: Error) => {
            observer.error(error);
          });
        } catch (error) {
          observer.error(error);
        }
      };

      makeRequest();
    });
  }

  // Optimize CV for ATS compatibility
  async optimizeCvAts(
    request: OptimizeAtsRequest,
  ): Promise<OptimizeAtsResponse> {
    const url = `${this.aiServiceUrl}/api/v1/cv/optimize-cv-ats`;

    return this.postWithRetry<OptimizeAtsRequest, OptimizeAtsResponse>({
      url,
      body: request,
      errorContext: "AI Service CV optimization failed",
    });
  }

  // Suggest CV field value
  async suggestCvField(
    request: CvFieldSuggestionRequest,
  ): Promise<CvFieldSuggestionResponse> {
    const url = `${this.aiServiceUrl}/api/v1/cv/suggest-cv`;

    this.logger.debug(
      `Requesting CV field suggestion for: ${request.targetField}`,
    );

    return this.postWithRetry<
      CvFieldSuggestionRequest,
      CvFieldSuggestionResponse
    >({
      url,
      body: request,
      errorContext: "AI Service CV field suggestion failed",
    });
  }

  async generateJobBlogPost(
    request: GenerateJobBlogPostRequest,
  ): Promise<GenerateJobBlogPostResponse> {
    const url = `${this.aiServiceUrl}/api/v1/blog/generate-job-blog-post`;

    return this.postWithRetry<
      GenerateJobBlogPostRequest,
      GenerateJobBlogPostResponse
    >({
      url,
      body: request,
      errorContext: "AI Service weekly blog generation failed",
    });
  }

  private postWithRetry<TRequest, TResponse>(params: {
    url: string;
    body: TRequest;
    errorContext: string;
  }): Promise<TResponse> {
    const { url, body, errorContext } = params;

    return firstValueFrom(
      this.httpService
        .post<TResponse>(url, body, {
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": this.apiKey,
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
            const errorMsg = this.formatAxiosErrorMessage(error);

            this.logger.error(`${errorContext}: ${errorMsg}`, error.stack);

            throw new Error(`${errorContext}: ${errorMsg}`);
          }),
          map((response: AxiosResponse<TResponse>): TResponse => response.data),
        ),
    );
  }

  async extractCv(request: ExtractCvRequest): Promise<ExtractCvResponse> {
    const url = `${this.aiServiceUrl}/api/v1/cv/extract`;

    return this.postWithRetry<ExtractCvRequest, ExtractCvResponse>({
      url,
      body: request,
      errorContext: "AI Service CV extraction failed",
    });
  }
}
