import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { AIClientService } from "./ai-client.service";
import { IAIService } from "@/core/abstracts/ai-services.abstract";

@Module({
  imports: [HttpModule.register({})],
  providers: [
    {
      provide: IAIService,
      useClass: AIClientService,
    },
  ],
  exports: [IAIService],
})
export class AIServicesModule {}
