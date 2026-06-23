import { Module } from "@nestjs/common";
import { RedisModule } from "@/frameworks/redis/redis.module";
import { TranslationModule } from "@/frameworks/translation/translation.module";
import { TranslationUseCase } from "./translation.use-case";

@Module({
  imports: [RedisModule, TranslationModule],
  providers: [TranslationUseCase],
  exports: [TranslationUseCase],
})
export class TranslationUseCasesModule {}
