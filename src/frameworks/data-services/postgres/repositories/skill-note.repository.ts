import { SkillNote } from "@/core/entities";
import { ISkillNoteRepository } from "@/core/abstracts";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import { skillNotes, roadmapSkills, roadmapPhases } from "../models";
import { eq, and } from "drizzle-orm";

@Injectable()
export class SkillNoteRepository
  extends GenericRepository<SkillNote, typeof skillNotes>
  implements ISkillNoteRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, skillNotes);
  }

  async getBySkillAndUser(
    roadmapSkillId: string,
    userId: string,
  ): Promise<SkillNote | null> {
    const result = await this.db
      .select()
      .from(skillNotes)
      .where(
        and(
          eq(skillNotes.roadmapSkillId, roadmapSkillId),
          eq(skillNotes.userId, userId),
        ),
      )
      .limit(1);

    return result[0] ?? null;
  }

  async upsert(
    roadmapSkillId: string,
    userId: string,
    content: string,
  ): Promise<SkillNote> {
    const existing = await this.getBySkillAndUser(roadmapSkillId, userId);

    if (existing) {
      const [updated] = await this.db
        .update(skillNotes)
        .set({ content, updatedAt: new Date() })
        .where(eq(skillNotes.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await this.db
      .insert(skillNotes)
      .values({ roadmapSkillId, userId, content })
      .returning();
    return created;
  }

  async getAllByRoadmapAndUser(
    roadmapId: string,
    userId: string,
  ): Promise<Array<SkillNote & { skillName: string; phaseName: string }>> {
    const result = await this.db
      .select({
        id: skillNotes.id,
        roadmapSkillId: skillNotes.roadmapSkillId,
        userId: skillNotes.userId,
        content: skillNotes.content,
        createdAt: skillNotes.createdAt,
        updatedAt: skillNotes.updatedAt,
        deletedAt: skillNotes.deletedAt,
        skillName: roadmapSkills.skill,
        phaseName: roadmapPhases.name,
      })
      .from(skillNotes)
      .innerJoin(roadmapSkills, eq(skillNotes.roadmapSkillId, roadmapSkills.id))
      .innerJoin(roadmapPhases, eq(roadmapSkills.phaseId, roadmapPhases.id))
      .where(
        and(
          eq(roadmapPhases.roadmapId, roadmapId),
          eq(skillNotes.userId, userId),
        ),
      )
      .orderBy(roadmapPhases.orderIndex, roadmapSkills.orderIndex);

    return result;
  }
}
