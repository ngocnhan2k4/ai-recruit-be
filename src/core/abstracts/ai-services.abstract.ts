import {
  OptimizeAtsRequest,
  OptimizeAtsResponse,
  CvFieldSuggestionRequest,
  CvFieldSuggestionResponse,
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
  JobCopilotRequest,
  JobCopilotResponse,
} from "../entities/job-copilot.entity";

export abstract class IAIService {
  abstract runJobCopilot(
    request: JobCopilotRequest,
  ): Promise<JobCopilotResponse>;

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

  abstract suggestCvField(
    request: CvFieldSuggestionRequest,
  ): Promise<CvFieldSuggestionResponse>;

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
