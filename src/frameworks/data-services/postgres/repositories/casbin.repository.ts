import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import { casbinRule } from "../models/casbin-rule.model";
import {
  ICasbinRepository,
  RemovePolicyParams,
  RemovePolicy2Params,
} from "@/core/abstracts/repositories/casbin-repository.abstract";
import { eq, and, or, SQL, isNull } from "drizzle-orm";

@Injectable()
export class CasbinRepository implements ICasbinRepository {
  constructor(@Inject("DRIZZLE") private readonly db: DBDrizzle) {}

  async removePolicy(params: RemovePolicyParams): Promise<number> {
    const { ptype, subject, object, action, effect = "allow" } = params;

    const whereConditions: SQL[] = [];

    // Always filter by ptype
    whereConditions.push(eq(casbinRule.ptype, ptype));

    // Filter by subject (v0) - required
    if (subject && subject !== "") {
      whereConditions.push(eq(casbinRule.v0, subject));
    }

    // Handle malformed policies where effect might be in v1 instead of v3
    // When object and action are both empty (wildcards), we need to check for malformed policies
    const isObjectActionWildcard =
      (!object || object === "") && (!action || action === "");

    if (isObjectActionWildcard && effect && effect !== "") {
      // Effect could be in v1 (malformed: [subject, effect]) or v3 (correct: [subject, object, action, effect])
      // Match either:
      // 1. Malformed: v1 = effect AND v2 IS NULL AND v3 IS NULL
      // 2. Correct: v3 = effect (and v1, v2 could be anything since they're wildcards)
      const malformedCondition = and(
        eq(casbinRule.v1, effect),
        isNull(casbinRule.v2),
        isNull(casbinRule.v3),
      );
      const correctCondition = eq(casbinRule.v3, effect);
      whereConditions.push(or(malformedCondition, correctCondition)!);
    } else {
      // Normal case: object and/or action are specified
      // Filter by object (v1) - empty string means wildcard (skip)
      if (object && object !== "") {
        whereConditions.push(eq(casbinRule.v1, object));
      }

      // Filter by action (v2) - empty string means wildcard (skip)
      if (action && action !== "") {
        whereConditions.push(eq(casbinRule.v2, action));
      }

      // Filter by effect (v3) - but also check v1 for malformed policies
      if (effect && effect !== "") {
        // Check both v1 and v3 for effect (handles malformed policies)
        // But only if object/action are not specified to avoid false matches
        const effectConditions = [
          eq(casbinRule.v1, effect),
          eq(casbinRule.v3, effect),
        ];
        whereConditions.push(or(...effectConditions)!);
      }
    }

    // Build final WHERE clause
    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Delete directly from database and get deleted rows
    const deletedRows = await this.db
      .delete(casbinRule)
      .where(whereClause)
      .returning();

    return deletedRows.length;
  }

  async removePolicy2(params: RemovePolicy2Params): Promise<number> {
    const {
      ptype,
      subject,
      domainType,
      object,
      action,
      effect = "allow",
    } = params;

    const whereConditions: SQL[] = [];

    // Always filter by ptype
    whereConditions.push(eq(casbinRule.ptype, ptype));

    // Filter by subject (v0) - required
    if (subject && subject !== "") {
      whereConditions.push(eq(casbinRule.v0, subject));
    }

    // Domain-based policy structure: [subject, domainType, object, action, effect]
    // v0: subject, v1: domainType, v2: object, v3: action, v4: effect

    // Handle malformed policies where effect might be in wrong position
    const isDomainTypeObjectActionWildcard =
      (!domainType || domainType === "") &&
      (!object || object === "") &&
      (!action || action === "");

    if (isDomainTypeObjectActionWildcard && effect && effect !== "") {
      // Effect could be in v1, v2, v3, or v4 depending on malformation
      // Most common malformed: [subject, effect] - effect in v1
      // Correct: [subject, domainType, object, action, effect] - effect in v4
      const malformedConditions = [
        and(
          eq(casbinRule.v1, effect),
          isNull(casbinRule.v2),
          isNull(casbinRule.v3),
          isNull(casbinRule.v4),
        ), // [subject, effect]
        and(
          eq(casbinRule.v2, effect),
          isNull(casbinRule.v3),
          isNull(casbinRule.v4),
        ), // [subject, domainType, effect]
        and(eq(casbinRule.v3, effect), isNull(casbinRule.v4)), // [subject, domainType, object, effect]
      ];
      const correctCondition = eq(casbinRule.v4, effect);

      const allConditions = [...malformedConditions, correctCondition];
      whereConditions.push(or(...allConditions)!);
    } else {
      // Normal case: domainType, object, and/or action are specified
      // Filter by domainType (v1) - empty string means wildcard (skip)
      if (domainType && domainType !== "") {
        whereConditions.push(eq(casbinRule.v1, domainType));
      }

      // Filter by object (v2) - empty string means wildcard (skip)
      if (object && object !== "") {
        whereConditions.push(eq(casbinRule.v2, object));
      }

      // Filter by action (v3) - empty string means wildcard (skip)
      if (action && action !== "") {
        whereConditions.push(eq(casbinRule.v3, action));
      }

      // Filter by effect (v4) - but also check other positions for malformed policies
      if (effect && effect !== "") {
        // Check v1, v2, v3, and v4 for effect (handles malformed policies)
        const effectConditions = [
          eq(casbinRule.v1, effect),
          eq(casbinRule.v2, effect),
          eq(casbinRule.v3, effect),
          eq(casbinRule.v4, effect),
        ];
        whereConditions.push(or(...effectConditions)!);
      }
    }

    // Build final WHERE clause
    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Delete directly from database and get deleted rows
    const deletedRows = await this.db
      .delete(casbinRule)
      .where(whereClause)
      .returning();

    return deletedRows.length;
  }
}
