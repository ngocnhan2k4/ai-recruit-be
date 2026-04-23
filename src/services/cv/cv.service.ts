import { Cv, CvExtractedData, IAIService, ICvService } from "@/core";
import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class CvService implements ICvService {
  private readonly logger = new Logger(CvService.name);
  constructor(private readonly aiService: IAIService) {}

  async extractCv(cv: Cv): Promise<CvExtractedData> {
    // [TODO]: Should get aiCv data here
    // if (cv.aiCvId) {
    // }

    const cvData = await this.aiService.extractCv({ url: cv.fileUrl });

    return {
      ...cvData,
      skillIds: cvData.skills.map((skill) => skill.id as string),
      provinceIds: cvData.provinces.map((province) => province.id as string),
      categoryIds: cvData.categories.map((category) => category.id as string),
      skillNames: cvData.skills.map((skill) => skill.name),
      provinceNames: cvData.provinces.map((province) => province.name),
      categoryNames: cvData.categories.map((category) => category.name),
    };
  }
}
