import { RelatedEntity } from "@/common/types";
import {
  AiCv,
  Category,
  Cv,
  CvExtractedData,
  CvSkillGroup,
  CvUploadFields,
  ExperienceLevelEnum,
  IAiCvRepository,
  IAIService,
  ICategoryRepository,
  ICvRepository,
  ICvService,
  IProvinceRepository,
  ISkillService,
  Province,
} from "@/core";
import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import type { MultipartFile } from "@fastify/multipart";
import { CV_FOLDER, RESPONSE_CODE } from "@/common/constants";
import { CloudinaryService } from "@/frameworks/storage/cloudinary/cloudinary.service";

@Injectable()
export class CvService implements ICvService {
  private readonly logger = new Logger(CvService.name);

  constructor(
    private readonly aiService: IAIService,
    private readonly aiCvRepository: IAiCvRepository,
    private readonly provinceRepository: IProvinceRepository,
    private readonly categoryRepository: ICategoryRepository,
    private readonly skillService: ISkillService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly cvRepository: ICvRepository,
  ) {}

  async uploadAndPersistCv(
    userId: string,
    file: MultipartFile,
    payload: CvUploadFields,
  ): Promise<Cv> {
    if (!file) {
      throw new BadRequestException({
        message: "CV file is required",
        code: RESPONSE_CODE.CV_FILE_REQUIRED,
      });
    }

    const uploadResult = await this.cloudinaryService.uploadFile(file, {
      folder: CV_FOLDER,
    });

    if (!uploadResult || !uploadResult.secure_url) {
      throw new BadRequestException({
        message: "Failed to upload file to storage",
        code: RESPONSE_CODE.ERROR_UPLOADING_FILE,
      });
    }

    const newCv = await this.cvRepository.create({
      userId: userId,
      aiCvId: payload.aiCvId,
      name: payload.name,
      fileUrl: uploadResult.secure_url,
      fileName: payload.fileName,
      mimeType: payload.mimeType,
      lastUsed: new Date(),
    });

    this.logger.log(
      `[uploadAndPersistCv] Created CV ${newCv.id} for user ${userId} with file URL: ${uploadResult.secure_url}`,
    );

    return newCv;
  }

  async extractCv(cv: Cv): Promise<CvExtractedData> {
    if (cv.aiCvId) {
      const aiCv = await this.aiCvRepository.get(cv.aiCvId);
      if (aiCv) {
        const cvData = await this.extractDataFromAiCv(aiCv);
        return cvData;
      }
    }

    const cvData = await this.aiService.extractCv({ url: cv.fileUrl });

    return {
      ...cvData,
      skillIds: (cvData.skills || []).map((skill) => skill.id as string),
      provinceIds: cvData.location ? [cvData.location.id as string] : [],
      categoryIds: cvData.category ? [cvData.category.id as string] : [],
      skillNames: cvData.skills?.map((skill) => skill.name) || [],
      provinceNames: cvData.location ? [cvData.location.name] : [],
      categoryNames: cvData.category ? [cvData.category.name] : [],
    };
  }

  private async extractDataFromAiCv(aiCv: AiCv): Promise<CvExtractedData> {
    const skills = await this.extractSkillFromAiCv(aiCv);
    const province = await this.extractProvinceFromAiCv(aiCv);
    const categories = await this.extractCategoryFromAiCv(aiCv);
    const experienceYears = this.extractExperienceYearsFromAiCv(aiCv);
    const experienceLevel = this.extractExperienceLevelFromAiCv(aiCv);

    return {
      experienceYears,
      experienceLevel,
      skillIds: skills.map((skill) => skill.id as string),
      skillNames: skills.map((skill) => skill.name),
      provinceIds: province ? [province.id as string] : [],
      categoryIds: categories.map((category) => category.id as string),
      provinceNames: province ? [province.name] : [],
      categoryNames: categories.map((category) => category.name),
    };
  }

  private extractExperienceYearsFromAiCv(aiCv: AiCv): number | null {
    const experiences = aiCv.cvData.experience || [];
    if (!experiences.length) return null;

    const intervals: Array<{ startMonth: number; endMonth: number }> = [];

    for (const exp of experiences) {
      const start = this.parseMonthIndex(exp.startDate);
      if (start === null) continue;

      const end = this.parseMonthIndex(exp.endDate) ?? this.currentMonthIndex();

      const startMonth = Math.min(start, end);
      const endMonth = Math.max(start, end);
      intervals.push({ startMonth, endMonth });
    }

    if (!intervals.length) return null;

    intervals.sort((a, b) => a.startMonth - b.startMonth);

    const merged: Array<{ startMonth: number; endMonth: number }> = [];
    for (const interval of intervals) {
      const last = merged[merged.length - 1];
      if (!last || interval.startMonth > last.endMonth + 1) {
        merged.push({ ...interval });
        continue;
      }
      last.endMonth = Math.max(last.endMonth, interval.endMonth);
    }

    const totalMonths = merged.reduce(
      (sum, it) => sum + (it.endMonth - it.startMonth + 1),
      0,
    );

    const years = totalMonths / 12;
    return Math.max(0, Math.round(years * 10) / 10);
  }

  private extractExperienceLevelFromAiCv(
    aiCv: AiCv,
  ): ExperienceLevelEnum | null {
    const fromTitle = this.mapTitleToExperienceLevel(
      aiCv.cvData.targetJobTitle,
    );
    if (fromTitle) return fromTitle;

    const mostRecentPosition = this.getMostRecentExperiencePosition(aiCv);
    return this.mapTitleToExperienceLevel(mostRecentPosition);
  }

  private getMostRecentExperiencePosition(aiCv: AiCv): string | null {
    const experiences = aiCv.cvData.experience || [];
    if (!experiences.length) return null;

    const scored = experiences
      .map((e) => {
        const end = this.parseMonthIndex(e.endDate) ?? this.currentMonthIndex();
        const start = this.parseMonthIndex(e.startDate) ?? end;
        return { e, end, start };
      })
      .sort((a, b) => {
        if (b.end !== a.end) return b.end - a.end;
        return b.start - a.start;
      });

    return scored[0]?.e?.position ?? null;
  }

  private mapTitleToExperienceLevel(
    title: string | null | undefined,
  ): ExperienceLevelEnum | null {
    if (!title) return null;

    const t = title.toLowerCase();
    const patterns = {
      [ExperienceLevelEnum.INTERN]:
        /\b(intern|internship|thực\s*tập|trainee)\b/,
      [ExperienceLevelEnum.FRESHER]: /\b(fresher|graduate|new\s*grad)\b/,
      [ExperienceLevelEnum.JUNIOR]: /\b(junior|jr\.?)\b/,
      [ExperienceLevelEnum.MIDDLE]:
        /\b(mid|middle|midlevel|mid-level|intermediate)\b/,
      [ExperienceLevelEnum.SENIOR]: /\b(senior|sr\.?)\b/,
      [ExperienceLevelEnum.LEAD]:
        /\b(lead|leader|tech\s*lead|team\s*lead|principal|architect|staff)\b/,
    };

    for (const [level, pattern] of Object.entries(patterns)) {
      if (pattern.test(t)) {
        return level as ExperienceLevelEnum;
      }
    }

    return null;
  }

  private currentMonthIndex(): number {
    const now = new Date();
    return now.getFullYear() * 12 + now.getMonth();
  }

  /*
  Parse the month index from the value
  - If the value is "present", "now", "current", "ongoing", "till now", "to date", "hiện tại", return the current month index
  - If the value is a valid month index, return the month index
  - If the value is a valid year, return the year * 12
  - If the value is a valid date, return the date in month index
  - If the value is not a valid month index, return null
  - Example:
    - "01/2026" -> 2026 * 12 + 0 = 24312
    - "2026/01" -> 2026 * 12 + 1 = 24313
    - "2026" -> 2026 * 12 = 24312
    - "01/2026" -> 2026 * 12 + 0 = 24312
    - "2026/01" -> 2026 * 12 + 1 = 24313
    - "2026" -> 2026 * 12 = 24312
  */
  private parseMonthIndex(value: string | null | undefined): number | null {
    if (!value) return null;
    const raw = value.trim();
    if (!raw) return null;

    const lower = raw.toLowerCase();
    const presentWords = new Set([
      "present",
      "now",
      "current",
      "ongoing",
      "till now",
      "to date",
      "hiện tại",
    ]);
    if (presentWords.has(lower)) {
      return this.currentMonthIndex();
    }

    const normalized = raw.replace(/\./g, "/").replace(/-/g, "/");

    const mmyyyy = normalized.match(/^(\d{1,2})\/(\d{4})$/); // 01/2026
    if (mmyyyy) {
      const m = Number(mmyyyy[1]);
      const y = Number(mmyyyy[2]);
      if (m >= 1 && m <= 12) return y * 12 + (m - 1);
    }

    const yyyymm = normalized.match(/^(\d{4})\/(\d{1,2})$/); // 2026/01
    if (yyyymm) {
      const y = Number(yyyymm[1]);
      const m = Number(yyyymm[2]);
      if (m >= 1 && m <= 12) return y * 12 + (m - 1);
    }

    const yyyy = normalized.match(/^(\d{4})$/); // 2026
    if (yyyy) {
      const y = Number(yyyy[1]);
      return y * 12;
    }

    const parsed = new Date(raw); // 2026-01-01
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.getFullYear() * 12 + parsed.getMonth();
    }

    return null;
  }

  private async extractSkillFromAiCv(aiCv: AiCv): Promise<RelatedEntity[]> {
    const skillSet = new Set<string>();
    aiCv.cvData.skills.technical.forEach((skill: CvSkillGroup) => {
      skill.items.forEach((item) => {
        skillSet.add(item);
      });
    });
    aiCv.cvData.projects.forEach((project) => {
      project.technologies.forEach((technology) => {
        skillSet.add(technology);
      });
    });
    // [TODO]: Add more skill here

    const skillNameArray = Array.from(skillSet);
    const { data } = await this.skillService.getSkillsSynonyms({
      exactNames: skillNameArray,
      skipCount: true,
      limit: skillNameArray.length,
    });

    const skills = data.map((skill) => ({
      id: skill.id,
      name: skill.masterName,
    }));

    return skills;
  }

  private async extractProvinceFromAiCv(
    aiCv: AiCv,
  ): Promise<RelatedEntity | null> {
    const provinces = await this.provinceRepository.getAll(["id", "name"]);
    const location = aiCv.cvData.personalInfo.location || "";

    if (!location) return null;

    const found = provinces.find((p) => this.compareProvince(location, p));

    return found ?? null;
  }

  /*
    Compare the location "hồ Chi Minh City" with province "Hồ Chí Minh"
    - Split the location into words: ["hồ", "Chi", "Minh", "City"]
    - Split the province into words: ["Hồ", "Chí", "Minh"]
    - Check if each word in the province is in the location
      - If all words in the province are in the location, return true
      - If any word in the province is not in the location, return false
  */
  private compareProvince(location: string, province: Province): boolean {
    const lowerLoc = location.toLowerCase();
    const provChars = province.name.toLowerCase().split(" ");
    return provChars.every((char) => lowerLoc.includes(char));
  }

  private async extractCategoryFromAiCv(aiCv: AiCv): Promise<RelatedEntity[]> {
    const categories = await this.categoryRepository.getAll(["id", "name"]);

    const categorySet = new Set<string>();

    aiCv.cvData.experience.forEach((experience) => {
      if (experience.position) {
        const cate = this.getCategory(categories, experience.position);
        if (cate) {
          categorySet.add(cate.id);
        }
      }
    });

    if (aiCv.cvData.targetJobTitle) {
      const cate = this.getCategory(categories, aiCv.cvData.targetJobTitle);
      if (cate) {
        categorySet.add(cate.id);
      }
    }

    // [TODO]: Add more category here

    const result = categories.filter((c) => categorySet.has(c.id));

    return result;
  }

  /*
  Get the category from the category name
  - Split the category name into words: ["backend", "developer"]
  - Check if each word in the category is in the category name
    - If the word is in the category name, add 1 to the match count
    - If the word is not in the category name, add 0 to the match count
    - If the match count is greater than the best score, set the best score to the match count and the best match to the category
    - If all words in the category are in the category name, return the category
    - If any word in the category is not in the category name, return null
  */
  private getCategory(
    categories: Category[],
    categoryName: string,
  ): Category | null {
    const words = categoryName.toLowerCase().split(/\s+/);

    let bestMatch: Category | null = null;
    let bestScore = 0;

    for (const c of categories) {
      const cateWords = c.name.toLowerCase().split(/\s+/);

      const matchCount = cateWords.filter((w) => words.includes(w)).length;
      const score = matchCount / cateWords.length;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = c;
      }
    }

    return bestScore >= 0.5 ? bestMatch : null;
  }

  calculateMatchingScore(
    cv: Record<string, any>,
    job: Record<string, any>,
  ): { score: number; criteria: Record<string, any> } {
    // Skill match (40%)
    const cvSkills: string[] = cv.skillIds || [];
    const jobSkills: string[] = job.skillIds || [];
    const matchedSkills = cvSkills.filter((s) => jobSkills.includes(s));
    const missingSkills = jobSkills.filter((s) => !cvSkills.includes(s));
    let skillScore = 0;
    if (jobSkills.length > 0) {
      skillScore = matchedSkills.length / jobSkills.length;
    }

    // Experience match (25%)
    const expYears: number | null = cv.experienceYears ?? null;
    const expMin: number | null = job.experienceMin ?? null;
    const expMax: number | null = job.experienceMax ?? null;
    let experienceScore = 1.0;
    if (expYears !== null && expMin !== null && expMax !== null) {
      if (expYears >= expMax) {
        experienceScore = 1.0;
      } else if (expYears >= expMin) {
        experienceScore = 0.8;
      } else if (expMin > 0 && expYears >= expMin * 0.7) {
        experienceScore = 0.5;
      } else {
        experienceScore = 0.2;
      }
    }

    // Location match (15%)
    const cvProvinces: string[] = cv.provinceIds || [];
    const jobProvinces: string[] = job.provinceIds || [];
    const locationMatched =
      jobProvinces.length === 0 ||
      cvProvinces.some((p) => jobProvinces.includes(p));
    const locationScore = locationMatched ? 1.0 : 0.0;

    // Category match (10%)
    const cvCategories: string[] = cv.categoryIds || [];
    const jobCategoryId: string = job.categoryId || "";
    let categoryScore = 0;
    if (jobCategoryId) {
      categoryScore = cvCategories.includes(jobCategoryId) ? 1.0 : 0.0;
    }

    // Salary match (10%)
    const expectedSalary: number | null = cv.expectedSalary ?? null;
    const salaryMax: number | null = job.salaryMax ?? null;
    let salaryScore = 1.0;
    if (expectedSalary !== null && salaryMax !== null) {
      if (expectedSalary <= salaryMax * 1.2) {
        salaryScore = 1.0;
      } else if (expectedSalary <= salaryMax * 1.5) {
        salaryScore = 0.7;
      } else {
        salaryScore = 0.3;
      }
    }

    const score =
      skillScore * 0.4 +
      experienceScore * 0.25 +
      locationScore * 0.15 +
      categoryScore * 0.1 +
      salaryScore * 0.1;

    const criteria = {
      skill: {
        matchedSkills,
        missingSkills,
      },
      experience: {
        cvYears: expYears,
        requiredMin: expMin,
        requiredMax: expMax,
      },
      location: {
        matched: locationMatched,
      },
      category: {
        matched: jobCategoryId ? cvCategories.includes(jobCategoryId) : null,
      },
      salary: {
        expected: expectedSalary,
        jobMax: salaryMax,
      },
    };

    return { score: Math.min(score * 100, 100), criteria };
  }
}
