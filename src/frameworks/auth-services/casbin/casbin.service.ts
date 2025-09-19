import { Injectable, OnModuleInit } from "@nestjs/common";
import { newEnforcer, Enforcer } from "casbin";
import { FileAdapter } from "casbin-file-adapter";
import * as path from "path";

@Injectable()
export class CasbinService implements OnModuleInit {
    private enforcer: Enforcer;
    async onModuleInit() {
        const modelPath = path.resolve(process.cwd(), "casbin_conf", "model.conf");
        const policyPath = path.resolve(process.cwd(), "casbin_conf", "policy.csv");
        const adapter = new FileAdapter(policyPath);
        this.enforcer = await newEnforcer(modelPath, adapter);
        await this.enforcer.loadPolicy();
    }
    getEnforcer(): Enforcer {
        return this.enforcer;
    }

    async can(roles: string[], obj: string, act: string): Promise<boolean> {
        for (const role of roles) {
            const allowed = await this.enforcer.enforce(role, obj, act);
            if (allowed) {
                return true;
            }
        }
        return false;
    }
}