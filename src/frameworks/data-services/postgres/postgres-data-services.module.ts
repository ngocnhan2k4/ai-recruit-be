import { Module } from "@nestjs/common";
import { IDataServices } from "../../../core";
import { PostgresDataServices } from "./postgres-data-services.service";

@Module({
  providers: [
    {
      provide: IDataServices,
      useClass: PostgresDataServices,
    },
  ],
  exports: [IDataServices],
})
export class PostgresDataServicesModule {}
