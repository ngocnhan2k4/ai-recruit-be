import { Cv, CvExtractedData } from "../entities";

export abstract class ICvService {
  abstract extractCv(cv: Cv): Promise<CvExtractedData>;
  abstract calculateMatchingScore(
    cv: Record<string, any>,
    job: Record<string, any>,
  ): { score: number; criteria: Record<string, any> };
}
