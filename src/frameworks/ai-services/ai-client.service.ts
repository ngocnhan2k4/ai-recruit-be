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
import OpenAI from "openai";

import {
  ExtractCvResponse,
  ExtractCvRequest,
  OptimizeAtsRequest,
  OptimizeAtsResponse,
} from "@/core";
import {
  CvFieldSuggestionRequest,
  CvFieldSuggestionResponse,
} from "@/core/entities/ai-cv.entity";

@Injectable()
export class AIClientService implements IAIService {
  private readonly logger = new Logger(AIClientService.name);
  private readonly aiServiceUrl: string;
  private readonly aiServiceTimeout: number;
  private readonly maxRetries: number;
  private readonly apiKey: string;
  private readonly openai: OpenAI;

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

    this.openai = new OpenAI({
      apiKey: this.apiKey, // Assuming AI_API_KEY is actually the OpenAI key. If not, this might fail. We should use OPENAI_API_KEY. Let's try OPENAI_API_KEY.
    });
    // Override with OPENAI_API_KEY if exists
    if (this.configService.get<string>("OPENAI_API_KEY")) {
      this.openai.apiKey = this.configService.get<string>("OPENAI_API_KEY")!;
    }
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

    return firstValueFrom(
      this.httpService
        .post<OptimizeAtsResponse>(url, request, {
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

  // Suggest CV field value
  async suggestCvField(
    request: CvFieldSuggestionRequest,
  ): Promise<CvFieldSuggestionResponse> {
    const url = `${this.aiServiceUrl}/api/v1/cv/suggest-cv`;

    this.logger.debug(
      `Requesting CV field suggestion for: ${request.targetField}`,
    );

    return firstValueFrom(
      this.httpService
        .post<CvFieldSuggestionResponse>(url, request, {
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

            this.logger.error(
              `AI Service CV field suggestion failed: ${errorMsg}`,
              error.stack,
            );

            throw new Error(
              `AI Service CV field suggestion failed: ${errorMsg}`,
            );
          }),
          map(
            (
              response: AxiosResponse<CvFieldSuggestionResponse>,
            ): CvFieldSuggestionResponse => response.data,
          ),
        ),
    );
  }

  async extractCv(request: ExtractCvRequest): Promise<ExtractCvResponse> {
    const url = `${this.aiServiceUrl}/api/v1/cv/extract`;

    return firstValueFrom(
      this.httpService
        .post<ExtractCvResponse>(url, request, {
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

            this.logger.error(
              `AI Service CV extraction failed: ${errorMsg}`,
              error.stack,
            );

            throw new Error(`AI Service CV extraction failed: ${errorMsg}`);
          }),

          map(
            (response: AxiosResponse<ExtractCvResponse>): ExtractCvResponse =>
              response.data,
          ),
        ),
    );
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text.substring(0, 8000), // OpenAI max tokens ~8k
        encoding_format: "float",
      });

      return response.data[0].embedding;
    } catch (error: any) {
      this.logger.error(`Failed to generate embedding: ${error.message}`);
      throw new Error(`Embedding generation failed: ${error.message}`);
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!texts.length) return [];
    try {
      const response = await this.openai.embeddings.create({
        model: "text-embedding-3-small",
        input: texts.map((t) => t.substring(0, 8000)),
        encoding_format: "float",
      });

      return response.data.map((d) => d.embedding);
    } catch (error: any) {
      this.logger.error(`Failed to generate embeddings: ${error.message}`);
      throw new Error(`Embeddings generation failed: ${error.message}`);
    }
  }
}
