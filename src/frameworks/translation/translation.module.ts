import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { GoogleTranslationService } from "./google-translation.service";

@Module({
  imports: [HttpModule.register({})],
  providers: [GoogleTranslationService],
  exports: [GoogleTranslationService],
})
export class TranslationModule {}
