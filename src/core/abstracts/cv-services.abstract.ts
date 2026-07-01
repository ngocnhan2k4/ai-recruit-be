import type { MultipartFile } from "@fastify/multipart";
import { Cv, CvExtractedData } from "../entities";

export type CvUploadFields = {
  aiCvId?: string;
  name?: string;
  fileName?: string;
  mimeType?: string;
};

export abstract class ICvService {
  abstract extractCv(cv: Cv): Promise<CvExtractedData>;
  abstract calculateMatchingScore(
    cv: Record<string, any>,
    job: Record<string, any>,
  ): { score: number | null; criteria: Record<string, any> };

  abstract uploadAndPersistCv(
    userId: string,
    file: MultipartFile,
    payload: CvUploadFields,
  ): Promise<Cv>;
}
