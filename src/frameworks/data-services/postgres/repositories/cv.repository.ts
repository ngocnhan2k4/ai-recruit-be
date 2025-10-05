import { Inject, Injectable } from "@nestjs/common";
import { eq, and, isNull, desc } from "drizzle-orm";
import { userCV } from "../models";
import { type DBDrizzle } from "@/frameworks/data-services/postgres/types";
import { GenericRepository } from "./generic-repository";
import { ICvRepository, Cv } from "@/core";

@Injectable()
export class CvRepository
  extends GenericRepository<Cv, typeof userCV>
  implements ICvRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, userCV);
  }

  async getByUserId(userId: string): Promise<Cv[]> {
    const result = await this.db
      .select()
      .from(userCV)
      .where(and(eq(userCV.userId, userId), isNull(userCV.deletedAt)))
      .orderBy(desc(userCV.lastUsed));

    return result as Cv[];
  }

  async getById(cvId: string): Promise<Cv | null> {
    const result = await this.db
      .select()
      .from(userCV)
      .where(and(eq(userCV.id, cvId), isNull(userCV.deletedAt)))
      .limit(1);

    return result[0] as Cv | null;
  }

  async updateLastUsed(cvId: string): Promise<void> {
    await this.db
      .update(userCV)
      .set({
        lastUsed: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userCV.id, cvId));
  }

  // Custom update method to match the interface
  async updateCv(cvId: string, cv: Partial<Cv>): Promise<Cv | null> {
    console.log("s", cv);
    const result = await this.db
      .update(userCV)
      .set(cv)
      .where(eq(userCV.id, cvId))
      .returning();

    return result[0] as Cv | null;
  }

  // Custom delete method to match the interface
  async deleteCv(cvId: string): Promise<boolean> {
    const result = await this.db
      .update(userCV)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userCV.id, cvId))
      .returning();

    return result.length > 0;
  }
}
