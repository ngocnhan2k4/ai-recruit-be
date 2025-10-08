import { Module } from "@nestjs/common";
import { ProvinceUseCases } from "./province.use-case";

@Module({
  providers: [ProvinceUseCases],
  exports: [ProvinceUseCases],
})
export class ProvinceUseCasesModule {}
