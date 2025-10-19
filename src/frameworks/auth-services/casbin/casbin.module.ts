import { Module } from "@nestjs/common";
import { newSyncedEnforcer } from "casbin";
import path from "path";
import { ConfigService } from "@nestjs/config";
import { CasbinService } from "./casbin.service";
import PostgresAdapter from "casbin-pg-adapter";

@Module({
  providers: [
    {
      provide: "CASBIN_ENFORCER",
      useFactory: async (configService: ConfigService) => {
        const modelPath = path.resolve(
          process.cwd(),
          "casbin_conf/rbac_model.conf",
        );

        // Get database URL
        const databaseUrl = configService.get<string>("DATABASE_URL");
        if (!databaseUrl) {
          throw new Error("DATABASE_URL is not configured");
        }

        // Create PostgreSQL adapter with existing casbin_rule table
        const adapter = await PostgresAdapter.newAdapter({
          connectionString: databaseUrl,
          migrate: false, // Disable migrations
        });

        // Create enforcer with the adapter
        const enforcer = await newSyncedEnforcer(modelPath, adapter);

        return enforcer;
      },
      inject: [ConfigService],
    },
    CasbinService,
  ],
  exports: ["CASBIN_ENFORCER", CasbinService],
})
export class CasbinModule {}
