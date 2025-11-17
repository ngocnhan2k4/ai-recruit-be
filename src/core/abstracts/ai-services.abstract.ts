import {
  GeneratedRoadmap,
  RoadmapGenerate,
} from "../entities/learning-path.entity";

export abstract class IAIService {
  abstract generateRoadmap(request: RoadmapGenerate): Promise<GeneratedRoadmap>;
}
