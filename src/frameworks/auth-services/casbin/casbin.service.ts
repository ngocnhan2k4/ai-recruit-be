import { Injectable, Inject } from "@nestjs/common";
import { PtypeEnum, RoleEnum } from "@/common/constants/roles";
import { newSyncedEnforcer, SyncedEnforcer } from "casbin";
import path from "path";
import { DrizzleCasbinAdapter } from "./casbin.adapter";
import { ConfigService } from "@nestjs/config";
import type { DBDrizzle } from "@/frameworks/data-services/postgres/types";
import { GetPoliciesCasbinFilter } from "@/interfaces/dtos/casbin";
import { PaginatedResult } from "@/common/types/api";
import { eq, and, count, SQL, asc, desc, gt } from "drizzle-orm";
import { casbinRule } from "@/frameworks/data-services/postgres/models/casbin-rule.model";
import { ICasbinRepository } from "@/core";

@Injectable()
export class CasbinService {
  private cache = new Map<string, SyncedEnforcer>();
  private readonly modelPath: string;
  private readonly sharedAdapter: DrizzleCasbinAdapter;
  private readonly enforcerAdapter: DrizzleCasbinAdapter;
  private readonly db: DBDrizzle;

  constructor(
    @Inject("CASBIN_ENFORCER") private readonly enforcer: SyncedEnforcer,
    private readonly configService: ConfigService,
    @Inject("DRIZZLE") db: DBDrizzle,
    private readonly casbinRepository: ICasbinRepository,
  ) {
    this.modelPath = path.resolve(
      process.cwd(),
      "src/common/config/rbac_model.conf",
    );
    // Get the adapter from the enforcer
    this.enforcerAdapter = (enforcer as any).adapter as DrizzleCasbinAdapter;
    this.sharedAdapter = this.enforcerAdapter;
    this.db = db;
  }

  getEnforcer(): SyncedEnforcer {
    return this.enforcer;
  }

  async getCachedEnforcer(userId: string): Promise<SyncedEnforcer> {
    // Check cache first
    if (this.cache.has(userId)) {
      return this.cache.get(userId) as SyncedEnforcer;
    }

    // Create new enforcer with filtered policies using shared adapter
    const newEnforcer = await newSyncedEnforcer(
      this.modelPath,
      this.sharedAdapter,
    );

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
    return await this.enforcer.addNamedPolicy(
      ptype,
      subject,
      object,
      action,
      effect,
    );
  }

  async removePolicy(
    ptype: PtypeEnum,
    subject: string,
    object: string,
    action: string,
    effect: string = "allow",
  ): Promise<boolean | undefined> {
    const deletedCount = await this.casbinRepository.removePolicy({
      ptype,
      subject,
      object,
      action,
      effect,
    });

    if (deletedCount > 0) {
      // Reload policies into memory after successful deletion
      await this.enforcer.loadPolicy();
      return true;
    }

    // No rows were deleted (no matching policies found)
    return false;
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
    return await this.enforcer.addNamedPolicy(
      ptype,
      subject,
      domainType,
      object,
      action,
      effect,
    );
  }

  async removePolicy2(
    ptype: PtypeEnum,
    subject: string,
    domainType: string,
    object: string,
    action: string,
    effect: string = "allow",
  ): Promise<boolean | undefined> {
    try {
      const deletedCount = await this.casbinRepository.removePolicy2({
        ptype,
        subject,
        domainType,
        object,
        action,
        effect,
      });

      if (deletedCount > 0) {
        // Reload policies into memory after successful deletion
        await this.enforcer.loadPolicy();
        return true;
      }

      // No rows were deleted (no matching policies found)
      return false;
    } catch (error) {
      console.error("Failed to remove policy2:", error);
      return false;
    }
  }

  // Role management methods for ptype "g" (basic role assignments)
  async addRoleForUser(user: string, role: string): Promise<boolean> {
    return await this.enforcer.addNamedGroupingPolicy(
      PtypeEnum.BASIC_ASSIGNMENT,
      user,
      role,
    );
  }

  async deleteRoleForUser(user: string, role: string): Promise<boolean> {
    return await this.enforcer.removeNamedGroupingPolicy(user, role);
  }

  // Role management methods for ptype "g2" (domain-based role assignments)
  async addRoleForUserInDomain(
    user: string,
    role: string,
    domainId: string,
  ): Promise<boolean> {
    // Always uppercase role for consistency
    const normalizedRole = role.toUpperCase();

    const result = await this.enforcer.addNamedGroupingPolicy(
      PtypeEnum.DOMAIN_ASSIGNMENT,
      user,
      normalizedRole,
      domainId,
    );

    // Clear user's cached enforcer so it reloads with new g2 policy
    if (result) {
      this.cache.delete(user);
    }

    return result;
  }

  async deleteRoleForUserInDomain(
    user: string,
    role: string,
    domainId: string,
  ): Promise<boolean> {
    // Always uppercase role for consistency
    const normalizedRole = role.toUpperCase();

    const result = await this.enforcer.removeNamedGroupingPolicy(
      PtypeEnum.DOMAIN_ASSIGNMENT,
      user,
      normalizedRole,
      domainId,
    );

    // Clear user's cached enforcer so it reloads without old g2 policy
    if (result) {
      this.cache.delete(user);
    }

    return result;
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

  async getAllPolicies(query: GetPoliciesCasbinFilter): Promise<string[][]> {
    // Get all policies first
    let policies: string[][];

    // If ptype is specified, get policies of that type
    if (query.ptype) {
      policies = await this.enforcer.getNamedPolicy(query.ptype);
    } else {
      // Get all policies (combines all ptypes)
      policies = await this.enforcer.getPolicy();
    }

    // Apply additional filters if specified
    if (query.ptype === PtypeEnum.BASIC) {
      // Basic policy structure: [subject, object, action, effect]
      return policies.filter((policy) => {
        if (query.subject && policy[0] !== query.subject) return false;
        if (query.object && policy[1] !== query.object) return false;
        return true;
      });
    } else if (query.ptype === PtypeEnum.DOMAIN) {
      // Domain policy structure: [subject, domainType, object, action, effect]
      return policies.filter((policy) => {
        if (query.subject && policy[0] !== query.subject) return false;
        if (query.domainType && policy[1] !== String(query.domainType))
          return false;
        if (query.object && policy[2] !== query.object) return false;
        return true;
      });
    } else if (!query.ptype) {
      // No ptype specified, filter across all policy types
      // This requires checking each policy type
      return policies.filter((policy) => {
        // Basic policies: [subject, object, action, effect]
        // Domain policies: [subject, domainType, object, action, effect]
        // We can't distinguish without ptype, so apply filters based on policy length
        if (query.subject) {
          if (policy[0] !== query.subject) return false;
        }
        if (query.object) {
          // For basic: index 1, for domain: index 2
          if (policy.length === 4 && policy[1] !== query.object) return false;
          if (policy.length === 5 && policy[2] !== query.object) return false;
        }
        if (query.domainType) {
          // Only applies to domain policies (length 5)
          if (policy.length === 5 && policy[1] !== String(query.domainType))
            return false;
        }
        return true;
      });
    }

    return policies;
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

  /**
   * Get policies from database with pagination and filtering
   * This method queries directly from the database instead of loading into memory
   */
  async getPoliciesPaginated(
    query: GetPoliciesCasbinFilter,
  ): Promise<PaginatedResult<string[]>> {
    // Build WHERE conditions based on filters
    const whereConditions: SQL[] = [];

    // Filter by ptype
    if (query.ptype) {
      whereConditions.push(eq(casbinRule.ptype, query.ptype));
    }

    // Filter by subject (v0)
    if (query.subject) {
      whereConditions.push(eq(casbinRule.v0, query.subject));
    }

    // Filter by domainType or object based on ptype
    if (query.ptype === PtypeEnum.BASIC) {
      // Basic policy: [subject, object, action, effect]
      // Object is at v1
      if (query.object) {
        whereConditions.push(eq(casbinRule.v1, query.object));
      }
    } else if (query.ptype === PtypeEnum.DOMAIN) {
      // Domain policy: [subject, domainType, object, action, effect]
      // DomainType is at v1, Object is at v2
      if (query.domainType) {
        whereConditions.push(eq(casbinRule.v1, query.domainType));
      }
      if (query.object) {
        whereConditions.push(eq(casbinRule.v2, query.object));
      }
    } else if (!query.ptype) {
      // No ptype specified - need to check both positions
      if (query.domainType) {
        // DomainType only exists in domain policies (v1)
        whereConditions.push(eq(casbinRule.v1, query.domainType));
        // Also filter by ptype to only get domain policies
        whereConditions.push(eq(casbinRule.ptype, PtypeEnum.DOMAIN));
      }
      if (query.object && !query.domainType) {
        // Object could be at v1 (basic) or v2 (domain)
        // We'll need to use OR condition, but drizzle doesn't easily support this
        // For simplicity, we'll check v1 first (basic policies)
        whereConditions.push(eq(casbinRule.v1, query.object));
      }
    }

    // Build final WHERE clause
    let whereClause: SQL | undefined =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Calculate pagination
    const limit = query.limit || 10;

    // Handle cursor-based pagination
    if (query.cursor && !query.page) {
      // Cursor-based pagination: use cursor to filter by ID
      const cursorId = parseInt(query.cursor, 10);
      if (!isNaN(cursorId)) {
        const cursorCondition = gt(casbinRule.id, cursorId);

        if (whereClause) {
          whereClause = and(whereClause, cursorCondition) || whereClause;
        } else {
          whereClause = cursorCondition;
        }
      }
    }

    // Only use offset for page-based pagination
    const offset = query.page ? (query.page - 1) * limit : 0;

    // Order by id for consistent pagination
    const orderByClause =
      query.sortDirection === "desc" ? desc(casbinRule.id) : asc(casbinRule.id);

    // Query policies with pagination (fetch one extra to check for next page)
    const policies = await this.db
      .select()
      .from(casbinRule)
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit + 1)
      .offset(offset);

    // Get total count for page-based pagination
    let total: number | undefined = undefined;
    if (query.page) {
      const countResult = await this.db
        .select({ count: count() })
        .from(casbinRule)
        .where(whereClause);
      total = Number(countResult[0]?.count || 0);
    }

    // Check if there's a next page
    const hasNextPage = policies.length > limit;
    const data = hasNextPage ? policies.slice(0, limit) : policies;

    // Convert database records to policy arrays
    const policyArrays = data.map((policy) => {
      const policyArray: string[] = [];
      if (policy.id) policyArray.push(policy.id.toString());
      if (policy.ptype) policyArray.push(policy.ptype);
      if (policy.v0) policyArray.push(policy.v0);
      if (policy.v1) policyArray.push(policy.v1);
      if (policy.v2) policyArray.push(policy.v2);
      if (policy.v3) policyArray.push(policy.v3);
      if (policy.v4) policyArray.push(policy.v4);
      if (policy.v5) policyArray.push(policy.v5);
      return policyArray;
    });

    // Calculate next cursor (for cursor-based pagination)
    let nextCursor: string | null = null;
    if (!query.page && hasNextPage && data.length > 0) {
      // Use the last item's ID as cursor
      const lastItem = policies[limit - 1];
      nextCursor = lastItem.id.toString();
    }

    return {
      data: policyArrays,
      pagination: {
        nextCursor,
        hasNextPage,
        total,
      },
    };
  }
}
