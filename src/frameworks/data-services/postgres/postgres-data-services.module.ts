import { Module } from "@nestjs/common";
import { IDataServices } from "../../../core";
import { PostgresDataServices } from "./postgres-data-services.service";
import { ConfigService } from "@nestjs/config";
import { drizzle } from "drizzle-orm/node-postgres";
@Module({
  providers: [
    {
      provide: 'DRIZZLE',
      useFactory: (configService: ConfigService) => {
        return drizzle({
          connection: {
            connectionString: configService.get<string>('DATABASE_URL'),  
            //ssl: true,
          },
          casing: "snake_case",
          });  
      },     
      inject: [ConfigService],
    },
    {
      provide: IDataServices,
      useClass: PostgresDataServices,
    },
  ],
  exports: [IDataServices],
})
export class PostgresDataServicesModule {}
