import { OptimizeAtsRequest, OptimizeAtsResponse } from "../entities";
import {
  PreviewRoadmapResponse,
  RoadmapGenerateRequest,
} from "../entities/learning-path.entity";

export abstract class IAIService {
  abstract generateRoadmap(
    request: RoadmapGenerateRequest,
  ): Promise<PreviewRoadmapResponse>;

  abstract optimizeCvAts(
    request: OptimizeAtsRequest,
  ): Promise<OptimizeAtsResponse>;
}
