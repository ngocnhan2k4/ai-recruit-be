import { Injectable, Inject } from "@nestjs/common";
import { PtypeEnum, RoleEnum } from "@/common/constants/roles";
import { newSyncedEnforcer, SyncedEnforcer } from "casbin";
import path from "path";
import { DrizzleCasbinAdapter } from "./casbin.adapter";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class CasbinService {
  private cache = new Map<string, SyncedEnforcer>();
  private readonly modelPath: string;

  constructor(
    @Inject("CASBIN_ENFORCER") private readonly enforcer: SyncedEnforcer,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    this.modelPath = path.resolve(
      process.cwd(),
      "src/common/config/rbac_model.conf",
    );
  }

  getEnforcer(): SyncedEnforcer {
    return this.enforcer;
  }

  async getCachedEnforcer(userId: string): Promise<SyncedEnforcer> {
    // Check cache first
    if (this.cache.has(userId)) {
      return this.cache.get(userId) as SyncedEnforcer;
    }

    const databaseAdapterUrl = this.configService.get<string>(
      "DATABASE_ADAPTER_URL",
    );

    const pool = new Pool({
      connectionString: databaseAdapterUrl,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false,
      max: 10,
      min: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    const db = drizzle(pool, {
      casing: "snake_case",
    });

    const adapter = new DrizzleCasbinAdapter(db);

    // Create new enforcer with filtered policies
    const newEnforcer = await newSyncedEnforcer(this.modelPath, adapter);

    // Load filtered policies: all "p" policies + user's "g" policies
    await newEnforcer.loadFilteredPolicy([
      { ptype: "p" }, // All policies
      { ptype: "g", v0: userId }, // Only this user's role assignments
    ]);

    // Cache the enforcer
    this.cache.set(userId, newEnforcer);

    return newEnforcer;
  }

  async can(roles: RoleEnum[], obj: string, act: string): Promise<boolean> {
    for (const role of roles) {
      const allowed = await this.enforcer.enforce(role, obj, act);
      if (allowed) {
        return true;
      }
    }
    return false;
  }

  // Policy management methods for ptype "p" (basic policies)
  async addPolicy(
    ptype: PtypeEnum,
    subject: string,
    object: string,
    action: string,
    effect: string = "allow",
  ): Promise<boolean> {
    try {
      await this.enforcer.addPolicy(ptype, subject, object, action, effect);
      return true;
    } catch (error) {
      console.error("Failed to add policy:", error);
      return false;
    }
  }

  async removePolicy(
    ptype: PtypeEnum,
    subject: string,
    object: string,
    action: string,
    effect: string = "allow",
  ): Promise<boolean> {
    try {
      await this.enforcer.removePolicy(ptype, subject, object, action, effect);
      return true;
    } catch (error) {
      console.error("Failed to remove policy:", error);
      return false;
    }
  }

  // Policy management methods for ptype "p2" (domain-based policies)
  async addPolicy2(
    ptype: PtypeEnum,
    subject: string,
    domainType: string,
    object: string,
    action: string,
    effect: string = "allow",
  ): Promise<boolean> {
    try {
      await this.enforcer.addPolicy(
        ptype,
        subject,
        domainType,
        object,
        action,
        effect,
      );
      return true;
    } catch (error) {
      console.error("Failed to add policy2:", error);
      return false;
    }
  }

  async removePolicy2(
    ptype: PtypeEnum,
    subject: string,
    domainType: string,
    object: string,
    action: string,
    effect: string = "allow",
  ): Promise<boolean> {
    try {
      await this.enforcer.removePolicy(
        ptype,
        subject,
        domainType,
        object,
        action,
        effect,
      );
      return true;
    } catch (error) {
      console.error("Failed to remove policy2:", error);
      return false;
    }
  }

  // Role management methods for ptype "g" (basic role assignments)
  async addRoleForUser(user: string, role: string): Promise<boolean> {
    try {
      await this.enforcer.addGroupingPolicy(user, role);
      return true;
    } catch (error) {
      console.error("Failed to add role for user:", error);
      return false;
    }
  }

  async deleteRoleForUser(user: string, role: string): Promise<boolean> {
    try {
      await this.enforcer.removeGroupingPolicy(user, role);
      return true;
    } catch (error) {
      console.error("Failed to delete role for user:", error);
      return false;
    }
  }

  // Role management methods for ptype "g2" (domain-based role assignments)
  async addRoleForUserInDomain(
    user: string,
    role: string,
    domainId: string,
  ): Promise<boolean> {
    try {
      await this.enforcer.addGroupingPolicy(user, role, domainId);
      return true;
    } catch (error) {
      console.error("Failed to add role for user in domain:", error);
      return false;
    }
  }

  async deleteRoleForUserInDomain(
    user: string,
    role: string,
    domainId: string,
  ): Promise<boolean> {
    try {
      await this.enforcer.removeGroupingPolicy(user, role, domainId);
      return true;
    } catch (error) {
      console.error("Failed to delete role for user in domain:", error);
      return false;
    }
  }

  async getRolesForUser(user: string): Promise<string[]> {
    return await this.enforcer.getRolesForUser(user);
  }

  async getUsersForRole(role: string): Promise<string[]> {
    return await this.enforcer.getUsersForRole(role);
  }

  async getRolesForUserInDomain(
    user: string,
    domainId: string,
  ): Promise<string[]> {
    return await this.enforcer.getRolesForUserInDomain(user, domainId);
  }

  async getUsersForRoleInDomain(
    role: string,
    domain: string,
  ): Promise<string[]> {
    return await this.enforcer.getUsersForRoleInDomain(role, domain);
  }

  async getAllPolicies(): Promise<string[][]> {
    return await this.enforcer.getPolicy();
  }

  async getAllRoles(): Promise<string[][]> {
    return await this.enforcer.getGroupingPolicy();
  }

  async savePolicy(): Promise<void> {
    await this.enforcer.savePolicy();
  }

  async loadPolicy(): Promise<void> {
    await this.enforcer.loadPolicy();
  }

  // Helper method to check permissions with domain support
  async canWithDomain(
    user: string,
    domainType: string,
    domainId: string,
    object: string,
    action: string,
  ): Promise<boolean> {
    return await this.enforcer.enforce(
      user,
      domainType,
      domainId,
      object,
      action,
    );
  }

  // Additional utility methods
  clearAllPolicies(): void {
    this.enforcer.clearPolicy();
  }

  async hasPolicy(rule: string[]): Promise<boolean> {
    return await this.enforcer.hasPolicy(...rule);
  }
}
