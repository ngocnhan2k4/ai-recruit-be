export abstract class IExchangeRateService {
  abstract getVndPerUsd(): Promise<number>;
}
