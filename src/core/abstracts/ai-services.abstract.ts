import { OptimizeAtsResponseDto } from "@/interfaces/dtos/cv/optimize-ats.dto";
import { CvLanguageEnum } from "../entities";
import {
  PreviewRoadmapResponse,
  RoadmapGenerateRequest,
} from "../entities/learning-path.entity";

export abstract class IAIService {
  abstract generateRoadmap(
    request: RoadmapGenerateRequest,
  ): Promise<PreviewRoadmapResponse>;

  abstract optimizeCvAts(params: {
    cvText: string;
    jobDescription: string;
    language?: CvLanguageEnum;
  }): Promise<OptimizeAtsResponseDto>;
}
