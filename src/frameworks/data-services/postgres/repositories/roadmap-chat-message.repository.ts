import { Injectable, Inject } from "@nestjs/common";
import { eq, and, isNull, asc, desc, inArray } from "drizzle-orm";
import { type DBDrizzle } from "../types";
import { roadmapChatMessages } from "../models";
import { RoadmapChatMessage } from "@/core/entities/learning-path.entity";
import { IRoadmapChatMessageRepository } from "@/core/abstracts/repositories/roadmap-chat-message-repository.abstract";

const MESSAGE_LIMIT = 50;

@Injectable()
export class RoadmapChatMessageRepository
  implements IRoadmapChatMessageRepository
{
  constructor(@Inject("DRIZZLE") private db: DBDrizzle) {}

  async getHistory(
    roadmapId: string,
    userId: string,
  ): Promise<RoadmapChatMessage[]> {
    const rows = await this.db
      .select()
      .from(roadmapChatMessages)
      .where(
        and(
          eq(roadmapChatMessages.roadmapId, roadmapId),
          eq(roadmapChatMessages.userId, userId),
          isNull(roadmapChatMessages.deletedAt),
        ),
      )
      .orderBy(asc(roadmapChatMessages.createdAt))
      .limit(MESSAGE_LIMIT);

    return rows.map((r) => ({
      id: r.id,
      roadmapId: r.roadmapId,
      userId: r.userId,
      role: r.role as "user" | "assistant",
      text: r.text,
      intent: r.intent ?? undefined,
      proposal: (r.proposal as RoadmapChatMessage["proposal"]) ?? undefined,
      proposalStatus:
        (r.proposalStatus as RoadmapChatMessage["proposalStatus"]) ?? null,
      createdAt: r.createdAt,
    }));
  }

  async saveMessages(
    messages: Array<{
      roadmapId: string;
      userId: string;
      role: "user" | "assistant";
      text: string;
      intent?: string;
      proposal?: object;
      proposalStatus?: string | null;
    }>,
  ): Promise<RoadmapChatMessage[]> {
    const inserted = await this.db
      .insert(roadmapChatMessages)
      .values(messages)
      .returning();

    const [{ roadmapId, userId }] = messages;
    const all = await this.db
      .select({ id: roadmapChatMessages.id })
      .from(roadmapChatMessages)
      .where(
        and(
          eq(roadmapChatMessages.roadmapId, roadmapId),
          eq(roadmapChatMessages.userId, userId),
          isNull(roadmapChatMessages.deletedAt),
        ),
      )
      .orderBy(desc(roadmapChatMessages.createdAt));

    if (all.length > MESSAGE_LIMIT) {
      const excessIds = all.slice(MESSAGE_LIMIT).map((r) => r.id);
      await this.db
        .update(roadmapChatMessages)
        .set({ deletedAt: new Date() })
        .where(inArray(roadmapChatMessages.id, excessIds));
    }

    return inserted.map((r) => ({
      id: r.id,
      roadmapId: r.roadmapId,
      userId: r.userId,
      role: r.role as "user" | "assistant",
      text: r.text,
      intent: r.intent ?? undefined,
      proposal: (r.proposal as RoadmapChatMessage["proposal"]) ?? undefined,
      proposalStatus:
        (r.proposalStatus as RoadmapChatMessage["proposalStatus"]) ?? null,
      createdAt: r.createdAt,
    }));
  }

  async updateProposalStatus(
    messageId: string,
    userId: string,
    status: "applied" | "dismissed",
  ): Promise<void> {
    await this.db
      .update(roadmapChatMessages)
      .set({ proposalStatus: status, updatedAt: new Date() })
      .where(
        and(
          eq(roadmapChatMessages.id, messageId),
          eq(roadmapChatMessages.userId, userId),
        ),
      );
  }

  async clearHistory(roadmapId: string, userId: string): Promise<void> {
    await this.db
      .update(roadmapChatMessages)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(roadmapChatMessages.roadmapId, roadmapId),
          eq(roadmapChatMessages.userId, userId),
          isNull(roadmapChatMessages.deletedAt),
        ),
      );
  }
}
