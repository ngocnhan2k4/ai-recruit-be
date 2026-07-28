import type {
  JobCopilotChatResult,
  JobCopilotConversationView,
} from "@/core/entities";

export class JobCopilotConversationViewDto
  implements JobCopilotConversationView
{
  conversation: JobCopilotConversationView["conversation"];
  messages: JobCopilotConversationView["messages"];
}

export class JobCopilotChatResultDto implements JobCopilotChatResult {
  outcome: JobCopilotChatResult["outcome"];
  conversation: JobCopilotChatResult["conversation"];
  messages: JobCopilotChatResult["messages"];
  workspace: JobCopilotChatResult["workspace"];
}
