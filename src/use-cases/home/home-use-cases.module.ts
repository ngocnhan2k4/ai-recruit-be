import { Module } from "@nestjs/common";
import { HomeUseCases } from "./home.use-case";

@Module({
  imports: [],
  providers: [HomeUseCases],
  exports: [HomeUseCases],
})
export class HomeUseCasesModule {}
