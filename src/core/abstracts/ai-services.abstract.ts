import {
  PreviewRoadmapResponse,
  RoadmapGenerateRequest,
} from "../entities/learning-path.entity";

export abstract class IAIService {
  abstract generateRoadmap(
    request: RoadmapGenerateRequest,
  ): Promise<PreviewRoadmapResponse>;
}
