import { CvExtractedData, ICvService } from "@/core";
import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class CvService implements ICvService {
  private readonly logger = new Logger(CvService.name);
  constructor() {}

  // [TODO]: Implement this function
  async extractCv(_cvId: string): Promise<CvExtractedData> {
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate async work
    return {
      name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zip: "",
      skillIds: [],
      skillNames: [],
      provinceIds: [],
      provinceNames: [],
      categoryIds: [],
      categoryNames: [],
      expectedSalary: undefined,
      experienceYears: undefined,
      personalInfo: "",
      summary: "",
      // Add more fields as needed
    };
  }

  async extractCvFromUrl(_url: string): Promise<CvExtractedData> {
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate async work
    return {
      name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zip: "",
      skillIds: [],
      skillNames: [],
      provinceIds: [],
      provinceNames: [],
      categoryIds: [],
      categoryNames: [],
      expectedSalary: undefined,
      experienceYears: undefined,
      personalInfo: "",
      summary: "",
      // Add more fields as needed
    };
  }
}
