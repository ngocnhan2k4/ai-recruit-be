import {
  OptimizeAtsRequest,
  OptimizeAtsResponse,
  CvFieldSuggestionRequest,
  CvFieldSuggestionResponse,
  ExtractCvRequest,
  ExtractCvResponse,
} from "../entities";
import { RoadmapGenerateRequest } from "../entities/learning-path.entity";
import { Observable } from "rxjs";
import { MessageEvent } from "@nestjs/common";

export abstract class IAIService {
  abstract generateRoadmap(
    request: RoadmapGenerateRequest,
  ): Observable<MessageEvent>;

  abstract optimizeCvAts(
    request: OptimizeAtsRequest,
  ): Promise<OptimizeAtsResponse>;

  abstract suggestCvField(
    request: CvFieldSuggestionRequest,
  ): Promise<CvFieldSuggestionResponse>;

  abstract extractCv(request: ExtractCvRequest): Promise<ExtractCvResponse>;
}
