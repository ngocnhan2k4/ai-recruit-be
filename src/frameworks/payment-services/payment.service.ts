import {
  BadRequestException,
  Injectable,
  Logger,
  MessageEvent,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom, retry, timeout, catchError, map } from "rxjs";
import { AxiosError, AxiosResponse } from "axios";

import {
  CreateTransactionRequest,
  CreateTransactionResponse,
} from "@/core/entities/payment.entity";
import { IPaymentService } from "@/core/abstracts/payment-services.abstract";
import { wait } from "@/common/utils";

@Injectable()
export class PaymentService implements IPaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly aiServiceUrl: string;
  private readonly aiServiceTimeout: number;
  private readonly maxRetries: number;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.aiServiceUrl = this.configService.get<string>("PAYMENT_SERVICE_URL")!;

    this.aiServiceTimeout = this.configService.get<number>(
      "PAYMENT_SERVICE_TIMEOUT",
    )!;
    this.maxRetries = this.configService.get<number>(
      "PAYMENT_SERVICE_MAX_RETRIES",
    )!;

    this.apiKey = this.configService.get<string>("PAYMENT_API_KEY")!;
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

  async createTransaction(
    request: CreateTransactionRequest,
  ): Promise<CreateTransactionResponse> {
    const url = `${this.aiServiceUrl}/api/v1/payments`;

    this.logger.debug(
      `Requesting transaction creation for: ${request.order.code}`,
    );

    return this.postWithRetry<
      CreateTransactionRequest,
      CreateTransactionResponse
    >({
      url,
      body: request,
      errorContext: "Payment Service",
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
            delay: (error, retryCount) => {
              if (error.status >= 400 && error.status < 500) {
                throw error;
              }
              const delayMs = Math.min(100 * Math.pow(2, retryCount), 10000);

              return wait(delayMs);
            },
            resetOnSuccess: true,
          }),
          catchError((error: AxiosError) => {
            const errorMsg = this.formatAxiosErrorMessage(error);

            this.logger.error(`${errorContext}: ${errorMsg}`, error.stack);

            throw new BadRequestException(`${errorContext}: ${errorMsg}`);
          }),
          map((response: AxiosResponse<TResponse>): TResponse => response.data),
        ),
    );
  }
}
