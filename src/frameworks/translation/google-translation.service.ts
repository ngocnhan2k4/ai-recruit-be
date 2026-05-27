import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AxiosError, AxiosResponse } from "axios";
import { firstValueFrom, map, retry, timeout } from "rxjs";

interface GoogleTranslateApiResponse {
  data: {
    translations: Array<{
      translatedText: string;
      detectedSourceLanguage?: string;
      model?: string;
    }>;
  };
}

export interface TranslateTextInput {
  text: string;
  targetLanguage: string;
  sourceLanguage?: string;
}

export interface TranslateTextOutput {
  translatedText: string;
  detectedSourceLanguage?: string;
}

@Injectable()
export class GoogleTranslationService {
  private readonly logger = new Logger(GoogleTranslationService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>("GOOGLE_TRANSLATE_API_KEY")!;
    this.baseUrl =
      this.configService.get<string>("GOOGLE_TRANSLATE_BASE_URL") ||
      "https://translation.googleapis.com/language/translate/v2";
    this.timeoutMs =
      this.configService.get<number>("GOOGLE_TRANSLATE_TIMEOUT") || 10000;
    this.maxRetries =
      this.configService.get<number>("GOOGLE_TRANSLATE_MAX_RETRIES") || 2;
  }

  async translateText(input: TranslateTextInput): Promise<TranslateTextOutput> {
    if (!this.apiKey) {
      throw new Error(
        "Missing GOOGLE_TRANSLATE_API_KEY. Please set it in environment variables.",
      );
    }

    const payload: Record<string, unknown> = {
      q: input.text,
      target: input.targetLanguage,
      format: "text",
    };

    if (input.sourceLanguage) {
      payload.source = input.sourceLanguage;
    }

    try {
      const result = await firstValueFrom(
        this.httpService
          .post<GoogleTranslateApiResponse>(this.baseUrl, payload, {
            params: { key: this.apiKey },
            headers: { "Content-Type": "application/json" },
          })
          .pipe(
            timeout(this.timeoutMs),
            retry({
              count: this.maxRetries,
              delay: (_, retryCount) =>
                new Promise((resolve) =>
                  setTimeout(resolve, 300 * (retryCount + 1)),
                ),
              resetOnSuccess: true,
            }),
            map(
              (
                response: AxiosResponse<GoogleTranslateApiResponse>,
              ): TranslateTextOutput => {
                const first = response.data?.data?.translations?.[0];
                if (!first?.translatedText) {
                  throw new Error(
                    "Google Translate returned empty translation",
                  );
                }
                return {
                  translatedText: first.translatedText,
                  detectedSourceLanguage: first.detectedSourceLanguage,
                };
              },
            ),
          ),
      );

      return result;
    } catch (error) {
      const axiosError = error as AxiosError<{ error?: { message?: string } }>;
      const googleMessage = axiosError.response?.data?.error?.message;
      const message = googleMessage || axiosError.message || "Unknown error";

      this.logger.error(`Google Translate API failed: ${message}`);
      throw new Error(`Google Translate API failed: ${message}`);
    }
  }
}
