import { CvExtractedData } from "../entities";

export abstract class ICvService {
  abstract extractCv(cvId: string): Promise<CvExtractedData>;

  abstract extractCvFromUrl(url: string): Promise<CvExtractedData>;
}
