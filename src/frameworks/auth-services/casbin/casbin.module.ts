import { Module } from "@nestjs/common";
import { newSyncedEnforcer } from "casbin";
import path from "path";
import { ConfigService } from "@nestjs/config";
import { CasbinService } from "./casbin.service";
import { DrizzleCasbinAdapter } from "./casbin.adapter";
import { PostgresDataServicesModule } from "@/frameworks/data-services/postgres/postgres-data-services.module";
import { DBDrizzle } from "@/frameworks/data-services/postgres/types";

@Module({
  imports: [PostgresDataServicesModule],
  providers: [
    {
      provide: "CASBIN_ENFORCER",
      useFactory: async (configService: ConfigService, db: DBDrizzle) => {
        const modelPath = path.resolve(
          process.cwd(),
          "src/common/config/rbac_model.conf",
        );

        const adapter = new DrizzleCasbinAdapter(db);

        // Create enforcer with the adapter
        const enforcer = await newSyncedEnforcer(modelPath, adapter);

        await enforcer.loadPolicy();
        return enforcer;
      },
      inject: [ConfigService, "DRIZZLE"],
    },
    CasbinService,
  ],
  exports: ["CASBIN_ENFORCER", CasbinService],
})
export class CasbinModule {}
