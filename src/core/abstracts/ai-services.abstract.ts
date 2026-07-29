import {
  OptimizeAtsRequest,
  OptimizeAtsResponse,
  OptimizeAtsResponseV2,
  CvFieldSuggestionRequest,
  CvFieldSuggestionResponse,
  CvFieldSuggestionResponseV2,
  GenerateJobBlogPostRequest,
  GenerateJobBlogPostResponse,
  ExtractCvRequest,
  ExtractCvResponse,
} from "../entities";
import {
  AILearningRoadmapResult,
  RoadmapGenerateRequest,
  SubpathGenerateRequest,
  AISubpathResult,
  RoadmapChatRequest,
  RoadmapChatResponse,
} from "../entities/learning-path.entity";
import { Observable } from "rxjs";
import { MessageEvent } from "@nestjs/common";
import {
  JobCopilotAiResponse,
  JobCopilotRequest,
} from "../entities/job-copilot.entity";
import type {
  CandidateBriefAiRequest,
  CandidateBriefAnalysis,
} from "../entities/candidate-brief.entity";
import type {
  JobCopilotChatExtractRequest,
  JobCopilotChatExtractResponse,
} from "../entities/job-copilot-conversation.entity";

export abstract class IAIService {
  abstract runCandidateBrief(
    request: CandidateBriefAiRequest,
  ): Promise<CandidateBriefAnalysis>;

  abstract runJobCopilot(
    request: JobCopilotRequest,
  ): Promise<JobCopilotAiResponse>;

  abstract extractJobCopilotChat(
    request: JobCopilotChatExtractRequest,
  ): Promise<JobCopilotChatExtractResponse>;

  abstract generateRoadmap(
    request: RoadmapGenerateRequest,
  ): Observable<MessageEvent>;

  abstract generateRoadmapV2(
    request: RoadmapGenerateRequest,
  ): Promise<AILearningRoadmapResult>;

  abstract generateSubPath(
    request: SubpathGenerateRequest,
  ): Promise<AISubpathResult>;

  abstract optimizeCvAts(
    request: OptimizeAtsRequest,
  ): Promise<OptimizeAtsResponse>;

  abstract optimizeCvAtsV2(
    request: OptimizeAtsRequest,
  ): Promise<OptimizeAtsResponseV2>;

  abstract suggestCvField(
    request: CvFieldSuggestionRequest,
  ): Promise<CvFieldSuggestionResponse>;

  abstract suggestCvFieldV2(
    request: CvFieldSuggestionRequest,
  ): Promise<CvFieldSuggestionResponseV2>;

  abstract generateJobBlogPost(
    request: GenerateJobBlogPostRequest,
  ): Promise<GenerateJobBlogPostResponse>;

  abstract extractCv(request: ExtractCvRequest): Promise<ExtractCvResponse>;

  abstract generateEmbedding(text: string): Promise<number[]>;
  abstract generateEmbeddings(texts: string[]): Promise<number[][]>;

  abstract chatWithRoadmap(
    request: RoadmapChatRequest,
  ): Promise<RoadmapChatResponse>;
}
