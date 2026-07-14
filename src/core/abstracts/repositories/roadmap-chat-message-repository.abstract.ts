import { RoadmapChatMessage } from "@/core/entities/learning-path.entity";

export abstract class IRoadmapChatMessageRepository {
  abstract getHistory(
    roadmapId: string,
    userId: string,
  ): Promise<RoadmapChatMessage[]>;

  abstract saveMessages(
    messages: Array<{
      roadmapId: string;
      userId: string;
      role: "user" | "assistant";
      text: string;
      intent?: string;
      proposal?: object;
      proposalStatus?: string | null;
    }>,
  ): Promise<RoadmapChatMessage[]>;

  abstract updateProposalStatus(
    messageId: string,
    userId: string,
    status: "applied" | "dismissed",
  ): Promise<void>;

  abstract clearHistory(roadmapId: string, userId: string): Promise<void>;
}
