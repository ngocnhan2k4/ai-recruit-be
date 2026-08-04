import { Module } from "@nestjs/common";
import { IMessageBuilder } from "@/core/abstracts/message-builder.abstract";
import { MessageBuilder } from "./message-builder.service";

@Module({
  providers: [
    {
      provide: IMessageBuilder,
      useClass: MessageBuilder,
    },
  ],
  exports: [IMessageBuilder],
})
export class MessageBuilderModule {}
