import { Module } from "@nestjs/common";
import { newSyncedEnforcer } from "casbin";
import PostgresAdapter from "casbin-pg-adapter";
import path from "path";
import { ConfigService } from "@nestjs/config";
import { CasbinService } from "./casbin.service";

@Module({
  providers: [
    {
      provide: "CASBIN_ENFORCER",
      useFactory: async (configService: ConfigService) => {
        const modelPath = path.resolve(
          process.cwd(),
          "casbin_conf",
          "rbac_model.conf",
        );

        const adapter = await PostgresAdapter.newAdapter({
          connectionString: configService.get<string>("DATABASE_URL"),
        });

        const enforcer = await newSyncedEnforcer(modelPath, adapter);
        await enforcer.loadPolicy();

        return enforcer;
      },
      inject: [ConfigService],
    },
    CasbinService,
  ],
  exports: ["CASBIN_ENFORCER", CasbinService],
})
export class CasbinModule {}
