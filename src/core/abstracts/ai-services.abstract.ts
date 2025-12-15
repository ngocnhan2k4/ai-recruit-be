import { OptimizeAtsRequest, OptimizeAtsResponse } from "../entities";
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
}
