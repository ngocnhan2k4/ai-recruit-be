import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { IAIService } from "@/core/abstracts";
import {
  GeneratedRoadmap,
  RoadmapGenerate,
} from "@/core/entities/learning-path.entity";
import { firstValueFrom, retry, timeout, catchError } from "rxjs";
import { AxiosError } from "axios";

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

  async generateRoadmap(request: RoadmapGenerate): Promise<GeneratedRoadmap> {
    const url = `${this.aiServiceUrl}/api/v1/generate-roadmap`;

    const response$ = this.httpService
      .post<GeneratedRoadmap>(url, request, {
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
}
