import {
  RoadmapChatIntent,
  RoadmapChatProposal,
} from "@/core/entities/learning-path.entity";

export class RoadmapChatResponseDto {
  intent: RoadmapChatIntent;
  reply: string;
  proposal?: RoadmapChatProposal;
  assistantMessageId?: string;
}

export class AddedSkillDto {
  skillId: string;
  optionId: string;
  skillName: string;
  phaseId: string;
}
