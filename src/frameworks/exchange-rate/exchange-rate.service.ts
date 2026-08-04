import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom, timeout, catchError, map } from "rxjs";
import { AxiosError, AxiosResponse } from "axios";
import { IExchangeRateService } from "@/core/abstracts/exchange-rate-services.abstract";
import { ICacheService } from "@/core/abstracts/cache.abstract";
import { CACHE_KEYS } from "@/common/constants";
import { DEFAULT_VND_PER_USD } from "@/common/utils";

interface ExchangeRateApiResponse {
  result: string;
  base_code: string;
  rates: Record<string, number>;
}

@Injectable()
export class ExchangeRateService implements IExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly cacheService: ICacheService,
  ) {}

  async getVndPerUsd(): Promise<number> {
    const cacheKey = CACHE_KEYS.exchangeRate.vndPerUsd();
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      const parsed = Number(cached);
      if (!Number.isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }

    try {
      const rate = await this.fetchVndPerUsd();
      const ttlSeconds = 3600;

      await this.cacheService.setWithExpiry(
        cacheKey,
        rate.toString(),
        ttlSeconds,
      );

      return rate;
    } catch (error) {
      const fallback = DEFAULT_VND_PER_USD;

      this.logger.warn(
        `Failed to fetch VND/USD rate, using fallback ${fallback}: ${(error as Error).message}`,
      );

      return fallback;
    }
  }

  private async fetchVndPerUsd(): Promise<number> {
    const apiUrl = this.configService.get<string>("EXCHANGE_RATE_API_URL")!;

    const response = await firstValueFrom(
      this.httpService.get<ExchangeRateApiResponse>(apiUrl).pipe(
        timeout(this.configService.get<number>("EXCHANGE_RATE_TIMEOUT_MS")!),
        catchError((error: AxiosError) => {
          throw new Error(
            error.response?.status
              ? `Exchange rate API returned ${error.response.status}`
              : error.message,
          );
        }),
        map((res: AxiosResponse<ExchangeRateApiResponse>) => res.data),
      ),
    );

    if (response.result !== "success") {
      throw new Error("Exchange rate API returned unsuccessful result");
    }

    const vndPerUsd = response.rates?.VND;
    if (!vndPerUsd || vndPerUsd <= 0) {
      throw new Error("VND rate not found in exchange rate API response");
    }

    this.logger.log(`Fetched VND/USD rate: ${vndPerUsd}`);
    return vndPerUsd;
  }
}
