import { Adapter, Helper } from "casbin";
import { eq, and, sql, SQL } from "drizzle-orm";
import { casbinRule } from "@/frameworks/data-services/postgres/models/casbin_rule.model";
import { NodePgDatabase } from "drizzle-orm/node-postgres";

type CasbinRuleRecord = {
  ptype: string;
  v0?: string;
  v1?: string;
  v2?: string;
  v3?: string;
  v4?: string;
  v5?: string;
};

export class DrizzleCasbinAdapter implements Adapter {
  private filtered = false;

  constructor(private readonly db: NodePgDatabase<Record<string, never>>) {}

  // -------------------------
  // Helpers
  // -------------------------
  private ruleToRecord(ptype: string, rule: string[]): CasbinRuleRecord {
    const record: CasbinRuleRecord = { ptype };
    rule.forEach((v, i) => (record[`v${i}` as keyof CasbinRuleRecord] = v));
    return record;
  }

  private lineToText(line: CasbinRuleRecord): string {
    const parts = [
      line.ptype,
      line.v0,
      line.v1,
      line.v2,
      line.v3,
      line.v4,
      line.v5,
    ]
      .filter(Boolean)
      .join(", ");
    return parts;
  }

  private buildWhereClause(ptype: string, rule: string[]): SQL {
    let where = eq(casbinRule.ptype, ptype);
    rule.forEach((v, i) => {
      const newCondition = (() => {
        switch (i) {
          case 0:
            return eq(casbinRule.v0, v);
          case 1:
            return eq(casbinRule.v1, v);
          case 2:
            return eq(casbinRule.v2, v);
          case 3:
            return eq(casbinRule.v3, v);
          case 4:
            return eq(casbinRule.v4, v);
          case 5:
            return eq(casbinRule.v5, v);
          default:
            return null;
        }
      })();
      if (newCondition) {
        where = and(where, newCondition) || where;
      }
    });
    return where;
  }

  private buildFilteredWhereClause(
    ptype: string,
    fieldIndex: number,
    fieldValues: string[],
  ): SQL {
    let where = eq(casbinRule.ptype, ptype);
    fieldValues.forEach((val, i) => {
      if (val) {
        const columnIndex = fieldIndex + i;
        const newCondition = (() => {
          switch (columnIndex) {
            case 0:
              return eq(casbinRule.v0, val);
            case 1:
              return eq(casbinRule.v1, val);
            case 2:
              return eq(casbinRule.v2, val);
            case 3:
              return eq(casbinRule.v3, val);
            case 4:
              return eq(casbinRule.v4, val);
            case 5:
              return eq(casbinRule.v5, val);
            default:
              return null;
          }
        })();
        if (newCondition) {
          where = and(where, newCondition) || where;
        }
      }
    });
    return where;
  }

  // -------------------------
  // Casbin API
  // -------------------------
  async loadPolicy(model: any) {
    this.filtered = false;
    const rows = await this.db.select().from(casbinRule);

    for (const line of rows) {
      if (line.ptype) {
        const text = this.lineToText(line as CasbinRuleRecord);
        Helper.loadPolicyLine(text, model);
      }
    }
  }

  async savePolicy(model: any) {
    if (this.filtered) throw new Error("cannot save a filtered policy");

    // Clear table
    await this.db.execute(
      sql.raw(`TRUNCATE TABLE ${casbinRule[Symbol.for("drizzle:tableName")]}`),
    );

    const lines: CasbinRuleRecord[] = [];

    // Load P and G rules
    ["p", "g"].forEach((sec) => {
      const astMap = model.model.get(sec);
      if (!astMap) return;
      astMap.forEach((ast, ptype) => {
        ast.policy.forEach((rule: string[]) => {
          lines.push(this.ruleToRecord(ptype as string, rule));
        });
      });
    });

    if (lines.length > 0) await this.db.insert(casbinRule).values(lines);
    return true;
  }

  async addPolicy(sec: string, ptype: string, rule: string[]) {
    const record = this.ruleToRecord(ptype, rule);
    await this.db.insert(casbinRule).values(record);
  }

  async addPolicies(sec: string, ptype: string, rules: string[][]) {
    const records = rules.map((r) => this.ruleToRecord(ptype, r));
    if (records.length > 0) await this.db.insert(casbinRule).values(records);
  }

  async removePolicy(sec: string, ptype: string, rule: string[]) {
    const where = this.buildWhereClause(ptype, rule);
    await this.db.delete(casbinRule).where(where);
  }

  async removePolicies(sec: string, ptype: string, rules: string[][]) {
    for (const rule of rules) {
      await this.removePolicy(sec, ptype, rule);
    }
  }

  async removeFilteredPolicy(
    sec: string,
    ptype: string,
    fieldIndex: number,
    ...fieldValues: string[]
  ) {
    const where = this.buildFilteredWhereClause(ptype, fieldIndex, fieldValues);
    await this.db.delete(casbinRule).where(where);
  }

  async updatePolicy(
    sec: string,
    ptype: string,
    oldRule: string[],
    newRule: string[],
  ) {
    const oldRecord = this.ruleToRecord(ptype, oldRule);
    const newRecord = this.ruleToRecord(ptype, newRule);
    const where = this.buildWhereClause(ptype, oldRule);
    await this.db.update(casbinRule).set(newRecord).where(where);
  }

  async updatePolicies(
    sec: string,
    ptype: string,
    oldRules: string[][],
    newRules: string[][],
  ) {
    for (let i = 0; i < oldRules.length; i++) {
      await this.updatePolicy(sec, ptype, oldRules[i], newRules[i]);
    }
  }

  async updateFilteredPolicies(
    sec: string,
    ptype: string,
    newPolicies: string[][],
    fieldIndex: number,
    ...fieldValues: string[]
  ): Promise<string[][]> {
    // 1. find old policies
    const where = this.buildFilteredWhereClause(ptype, fieldIndex, fieldValues);
    const oldLines = await this.db.select().from(casbinRule).where(where);

    // 2. delete old
    await this.db.delete(casbinRule).where(where);

    // 3. insert new
    const newLines = newPolicies.map((rule) => this.ruleToRecord(ptype, rule));
    if (newLines.length > 0) await this.db.insert(casbinRule).values(newLines);

    return oldLines.map(
      (l) =>
        [l.ptype, l.v0, l.v1, l.v2, l.v3, l.v4, l.v5].filter(
          Boolean,
        ) as string[],
    );
  }

  isFiltered() {
    return this.filtered;
  }
}
