import { Global, Module } from "@nestjs/common";
import { ContextStorage } from "./context.store";

@Global()
@Module({
  providers: [ContextStorage],
  exports: [ContextStorage],
})
export class ContextModule {}
