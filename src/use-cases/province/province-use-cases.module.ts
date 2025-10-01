import { Module } from "@nestjs/common";
import { DataServicesModule } from "@/services/data-services/data-services.module";
import { ProvinceUseCases } from "./province.use-case";

@Module({
  imports: [DataServicesModule],
  providers: [ProvinceUseCases],
  exports: [ProvinceUseCases],
})
export class ProvinceUseCasesModule {}
