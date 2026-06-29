import {
  GetListSkillResponse,
  ISkillRepository,
  Skill,
  SkillFilter,
  SkillReviewStatus,
} from "@/core";
import { normalizeString } from "@/common/utils";
import { convertDateToStr } from "@/common/utils";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import {
  skills,
  questions,
  jobSkills,
  skillsSynonyms,
  userOnboardings,
  userSkills,
} from "../models";
import { jobs, jobProvinces } from "../models/job.model";
import { PaginatedResult } from "@/common/types";
import {
  count,
  ilike,
  and,
  SQL,
  sql,
  asc,
  desc,
  eq,
  inArray,
  gte,
  lte,
  isNotNull,
} from "drizzle-orm";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "cache-manager";
import { CACHE_KEYS } from "@/common/constants/cache";

@Injectable()
export class SkillRepository
  extends GenericRepository<Skill, typeof skills>
  implements ISkillRepository
{
  constructor(
    @Inject("DRIZZLE") protected db: DBDrizzle,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    super(db, skills);
  }

  private toSqlUuidArray(values: string[]): SQL {
    return sql`ARRAY[${sql.join(
      values.map((value) => sql`${value}`),
      sql`, `,
    )}]::uuid[]`;
  }

  private toSqlTextArray(values: string[]): SQL {
    return sql`ARRAY[${sql.join(
      values.map((value) => sql`${value}`),
      sql`, `,
    )}]::text[]`;
  }

  async createMany(skillValues: Omit<Skill, "id">[]): Promise<Skill[]> {
    const result = await this.db
      .insert(skills)
      .values(skillValues)
      .onConflictDoNothing({
        target: [skills.name],
      })
      .returning();

    return result;
  }

  async getPaginatedSkills(
    query: SkillFilter,
  ): Promise<PaginatedResult<GetListSkillResponse>> {
    const limit = query.limit ?? 10;
    const page = query.page ?? 1;
    const sortBy =
      query.sortBy === "questionCount"
        ? "questionCount"
        : query.sortBy === "createdAt"
          ? "createdAt"
          : "name";
    const sortDirection = query.sortDirection ?? "asc";
    const offset = (page - 1) * limit;
    const includeQuestionCount = query.fields?.includes("questionCount");

    if (sortBy === "questionCount" && !includeQuestionCount) {
      throw Error("Sory by question count only support when fields include it");
    }

    // Step 1: build where
    const whereClause = and(...this.buildWhereCondition(query));

    const questionCountExpr = count(questions.id).as("questionCount");

    const selectFields = {
      id: skills.id,
      slug: skills.slug,
      name: skills.name,
    };

    if (sortBy === "createdAt") {
      selectFields["createdAt"] = skills.createdAt;
    }

    if (includeQuestionCount) {
      selectFields["questionCount"] = questionCountExpr;
    }

    // Step 2: build select
    let baseQuery = this.db
      .select(selectFields)
      .from(skills)
      .where(whereClause);

    // Step 3: build join
    baseQuery = this.joinBuilder(baseQuery, query);

    const orderByClause =
      sortBy === "questionCount"
        ? sortDirection === "desc"
          ? desc(questionCountExpr)
          : asc(questionCountExpr)
        : sortBy === "createdAt"
          ? sortDirection === "desc"
            ? desc(skills.createdAt)
            : asc(skills.createdAt)
          : sortDirection === "desc"
            ? desc(skills.name)
            : asc(skills.name);

    const [rows, totalRow] = await Promise.all([
      baseQuery.orderBy(orderByClause).limit(limit).offset(offset),
      !query.skipCount
        ? this.db
            .select({ count: count(skills.id) })
            .from(skills)
            .where(whereClause)
        : Promise.resolve({ count: 0 }),
    ]);

    const data = rows.map((r) => ({
      ...r,
      questionCount: includeQuestionCount
        ? Number((r as any).questionCount ?? 0)
        : undefined,
    }));
    const total = Number(totalRow[0].count ?? 0);
    const hasNext = offset + data.length < total;

    return {
      data,
      pagination: {
        total,
        hasNextPage: hasNext,
      },
    };
  }

  private buildWhereCondition(query: SkillFilter) {
    const keyword = query.keyword ?? "";
    const skillIds = query.skillIds || [];
    const isApproved = query.isApproved ?? true;

    const whereConditions: SQL[] = [eq(skills.isApproved, isApproved)];

    if (keyword) {
      whereConditions.push(ilike(skills.name, `%${keyword}%`));
    }

    if (skillIds.length > 0) {
      whereConditions.push(inArray(skills.id, skillIds));
    }

    if (query.questions) {
      whereConditions.push(sql`EXISTS (
        SELECT 1 FROM ${questions}
        WHERE ${questions.skillId} = ${skills.id}
      )`);
    }

    if ((query.exactNames?.length || 0) > 0) {
      whereConditions.push(inArray(skills.name, query.exactNames as string[]));
    }

    return whereConditions;
  }

  private joinBuilder(db: any, query: SkillFilter) {
    let _db = db;

    const fields = query.fields || [];

    if (fields.includes("questionCount")) {
      _db = _db
        .leftJoin(questions, eq(questions.skillId, skills.id))
        .groupBy(skills.id);
    }

    return _db;
  }

  async getSkillById(id: string): Promise<Pick<Skill, "name" | "id"> | null> {
    const skill = await this.db
      .select({
        id: skills.id,
        name: skills.name,
      })
      .from(skills)
      .where(and(eq(skills.id, id), eq(skills.isApproved, true)))
      .limit(1);

    return skill[0] ?? null;
  }

  async bulkReviewSkills(
    ids: string[],
    status: SkillReviewStatus,
  ): Promise<void> {
    if (ids.length === 0) return;

    if (status === SkillReviewStatus.APPROVED) {
      await this.db
        .update(skills)
        .set({ isApproved: true })
        .where(inArray(skills.id, ids));
    } else {
      await this.db.transaction(async (tx) => {
        await tx.delete(jobSkills).where(inArray(jobSkills.skillId, ids));
        await tx.delete(skills).where(inArray(skills.id, ids));
      });
    }

    // Invalidate the cache whenever skills are reviewed (approved or deleted)
    await this.cacheManager.del(CACHE_KEYS.skill.getAll());
  }

  async getTopDemandedSkills(
    limit: number,
    fromDate?: Date,
    toDate?: Date,
    provinceId?: string,
    categoryId?: string,
  ): Promise<{ name: string; jobCount: number }[]> {
    const conditions: SQL[] = [
      eq(skills.isApproved, true),
      isNotNull(jobs.datePosted),
    ];

    if (fromDate) {
      conditions.push(gte(jobs.datePosted, convertDateToStr(fromDate)));
    }
    if (toDate) {
      conditions.push(lte(jobs.datePosted, convertDateToStr(toDate)));
    }
    if (provinceId) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${jobProvinces} jp
          WHERE jp.job_id = ${jobs.id}
          AND jp.province_id = ${provinceId}
        )`,
      );
    }
    if (categoryId) {
      conditions.push(eq(jobs.categoryId, categoryId));
    }

    const result = await this.db
      .select({
        name: skills.name,
        jobCount: count(jobSkills.jobId).as("jobCount"),
      })
      .from(skills)
      .innerJoin(jobSkills, eq(skills.id, jobSkills.skillId))
      .innerJoin(jobs, eq(jobs.id, jobSkills.jobId))
      .where(and(...conditions))
      .groupBy(skills.name)
      .orderBy(desc(count(jobSkills.jobId)))
      .limit(limit);

    return result.map((r) => ({
      name: r.name,
      jobCount: Number(r.jobCount),
    }));
  }

  async deleteSkillAndReferences(skillIds: string[]): Promise<void> {
    const ids = Array.isArray(skillIds) ? skillIds : [skillIds as any];
    if (ids.length === 0) return;

    const uuidArray = this.toSqlUuidArray(ids);
    const textArray = this.toSqlTextArray(ids);

    await this.executeWithTransaction(async (tx) => {
      await tx.execute(sql`
        DELETE FROM blog_post_tags
        WHERE skill_id = ANY(${uuidArray})
      `);

      await tx.delete(jobSkills).where(inArray(jobSkills.skillId, ids));
      await tx.delete(userSkills).where(inArray(userSkills.skillId, ids));
      await tx.delete(questions).where(inArray(questions.skillId, ids));

      await tx.execute(sql`
        UPDATE user_onboardings
        SET skills = (
          SELECT COALESCE(
            jsonb_agg(elem),
            '[]'::jsonb
          )
          FROM jsonb_array_elements(COALESCE(user_onboardings.skills, '[]'::jsonb)) AS elem
          WHERE (elem #>> '{}') <> ALL(${textArray})
        )
        WHERE ${userOnboardings.skills} IS NOT NULL
      `);

      await tx.execute(sql`
        UPDATE learning_roadmaps
        SET current_skills = (
          SELECT COALESCE(
            jsonb_agg(elem),
            '[]'::jsonb
          )
          FROM jsonb_array_elements(COALESCE(learning_roadmaps.current_skills, '[]'::jsonb)) AS elem
          WHERE (elem ->> 'skillId') <> ALL(${textArray})
        )
        WHERE current_skills IS NOT NULL
      `);

      await tx.execute(sql`
        UPDATE user_tests
        SET selected_skill_ids = (
          SELECT COALESCE(
            jsonb_agg(elem),
            '[]'::jsonb
          )
          FROM jsonb_array_elements(COALESCE(user_tests.selected_skill_ids, '[]'::jsonb)) AS elem
          WHERE (elem #>> '{}') <> ALL(${textArray})
        )
        WHERE selected_skill_ids IS NOT NULL
      `);

      await tx.delete(skills).where(inArray(skills.id, ids));
    });

    await this.cacheManager.del(CACHE_KEYS.skill.getAll());
    await this.cacheManager.del(CACHE_KEYS.skillSynonym.getAll());
  }

  async mergeSkillsAndReferences(
    targetSkillId: string,
    sourceSkillIds: string[],
  ): Promise<void> {
    const sourceIds = Array.from(
      new Set(sourceSkillIds.filter((id) => id !== targetSkillId)),
    );
    if (sourceIds.length === 0) return;

    const sourceUuidArray = this.toSqlUuidArray(sourceIds);
    const sourceTextArray = this.toSqlTextArray(sourceIds);

    await this.executeWithTransaction(async (tx) => {
      const targetSkillRows = await tx
        .select({ id: skills.id, name: skills.name })
        .from(skills)
        .where(eq(skills.id, targetSkillId))
        .limit(1);

      const targetSkill = targetSkillRows[0];
      if (!targetSkill) {
        throw new Error(`Target skill not found: ${targetSkillId}`);
      }

      const sourceSkills = await tx
        .select({ id: skills.id, name: skills.name })
        .from(skills)
        .where(inArray(skills.id, sourceIds));

      const targetMasterName = normalizeString(targetSkill.name);

      await tx.execute(sql`
        DELETE FROM blog_post_tags AS src
        USING blog_post_tags AS tgt
        WHERE src.skill_id = ANY(${sourceUuidArray})
          AND tgt.skill_id = ${targetSkillId}::uuid
          AND src.post_id = tgt.post_id
          AND src.tag_id IS NOT DISTINCT FROM tgt.tag_id
      `);

      await tx.execute(sql`
        UPDATE blog_post_tags
        SET skill_id = ${targetSkillId}::uuid
        WHERE skill_id = ANY(${sourceUuidArray})
      `);

      await tx.execute(sql`
        DELETE FROM job_skills
        WHERE skill_id = ANY(${sourceUuidArray})
          AND job_id IN (
            SELECT job_id
            FROM job_skills
            WHERE skill_id = ${targetSkillId}::uuid
          )
      `);

      await tx.execute(sql`
        DELETE FROM user_skills
        WHERE skill_id = ANY(${sourceUuidArray})
          AND user_id IN (
            SELECT user_id
            FROM user_skills
            WHERE skill_id = ${targetSkillId}::uuid
          )
      `);

      await tx.execute(sql`
        UPDATE job_skills
        SET skill_id = ${targetSkillId}::uuid
        WHERE skill_id = ANY(${sourceUuidArray})
      `);

      await tx.execute(sql`
        UPDATE user_skills
        SET skill_id = ${targetSkillId}::uuid
        WHERE skill_id = ANY(${sourceUuidArray})
      `);

      await tx.execute(sql`
        UPDATE user_onboardings
        SET skills = (
          SELECT COALESCE(
            jsonb_agg(DISTINCT CASE
              WHEN elem #>> '{}' = ANY(${sourceTextArray}) THEN to_jsonb(${targetSkillId}::text)
              ELSE elem
            END),
            '[]'::jsonb
          )
          FROM jsonb_array_elements(COALESCE(user_onboardings.skills, '[]'::jsonb)) AS elem
        )
        WHERE ${userOnboardings.skills} IS NOT NULL
      `);

      await tx.execute(sql`
        UPDATE learning_roadmaps
        SET current_skills = (
          SELECT COALESCE(
            jsonb_agg(DISTINCT CASE
              WHEN elem ->> 'skillId' = ANY(${sourceTextArray})
                THEN jsonb_set(elem, '{skillId}', to_jsonb(${targetSkillId}::text), false)
              ELSE elem
            END),
            '[]'::jsonb
          )
          FROM jsonb_array_elements(COALESCE(learning_roadmaps.current_skills, '[]'::jsonb)) AS elem
        )
        WHERE current_skills IS NOT NULL
      `);

      await tx.execute(sql`
        UPDATE user_tests
        SET selected_skill_ids = (
          SELECT COALESCE(
            jsonb_agg(DISTINCT CASE
              WHEN elem #>> '{}' = ANY(${sourceTextArray}) THEN to_jsonb(${targetSkillId}::text)
              ELSE elem
            END),
            '[]'::jsonb
          )
          FROM jsonb_array_elements(COALESCE(user_tests.selected_skill_ids, '[]'::jsonb)) AS elem
        )
        WHERE selected_skill_ids IS NOT NULL
      `);

      await tx.execute(sql`
        DELETE FROM skills_synonyms AS src
        USING skills_synonyms AS tgt
        WHERE src.master_skill_id = ANY(${sourceUuidArray})
          AND tgt.master_skill_id = ${targetSkillId}::uuid
          AND src.alias_name = tgt.alias_name
      `);

      await tx
        .update(skillsSynonyms)
        .set({ masterSkillId: targetSkillId })
        .where(inArray(skillsSynonyms.masterSkillId, sourceIds));

      const aliasFromOldSkills = sourceSkills
        .map((skill) => normalizeString(skill.name))
        .filter((name) => name.length > 0 && name !== targetMasterName);

      if (aliasFromOldSkills.length > 0) {
        await tx
          .insert(skillsSynonyms)
          .values(
            aliasFromOldSkills.map((aliasName) => ({
              masterSkillId: targetSkillId,
              aliasName,
            })),
          )
          .onConflictDoNothing();
      }

      await tx.delete(skills).where(inArray(skills.id, sourceIds));
    });

    await this.cacheManager.del(CACHE_KEYS.skill.getAll());
    await this.cacheManager.del(CACHE_KEYS.skillSynonym.getAll());
  }
}
