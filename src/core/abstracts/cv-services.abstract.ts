import { Cv, CvExtractedData } from "../entities";

export abstract class ICvService {
  abstract extractCv(cv: Cv): Promise<CvExtractedData>;
}
