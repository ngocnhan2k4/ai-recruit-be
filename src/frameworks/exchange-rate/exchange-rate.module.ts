import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ExchangeRateService } from "./exchange-rate.service";
import { IExchangeRateService } from "@/core/abstracts/exchange-rate-services.abstract";
import { RedisModule } from "@/frameworks/redis/redis.module";

@Module({
  imports: [HttpModule, RedisModule],
  providers: [
    ExchangeRateService,
    {
      provide: IExchangeRateService,
      useClass: ExchangeRateService,
    },
  ],
  exports: [IExchangeRateService],
})
export class ExchangeRateModule {}
