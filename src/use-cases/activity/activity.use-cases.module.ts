import { Module } from "@nestjs/common";
import { MessageBuilderModule } from "@/frameworks/message-builder/message-builder.module";
import { ActivityUseCase } from "./activity.use-case";

@Module({
  imports: [MessageBuilderModule],
  providers: [ActivityUseCase],
  exports: [ActivityUseCase],
})
export class AuditUseCasesModule {}
