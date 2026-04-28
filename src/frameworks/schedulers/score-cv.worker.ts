import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { SCORE_CV_QUEUE } from "@/common/constants";
import { IJobRepository, ISearchService } from "@/core/abstracts";

type ScoreCvApplyData = {
  applyId: string;
  jobId: string;
  cvId: string;
};

@Processor(SCORE_CV_QUEUE, {
  concurrency: 8,
})
export class ScoreCvWorker extends WorkerHost {
  private readonly logger = new Logger(ScoreCvWorker.name);

  constructor(
    private readonly jobRepository: IJobRepository,
    private readonly searchService: ISearchService,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job) {
    return this.processCvScoring(job.data as ScoreCvApplyData);
  }

  private async processCvScoring(data: ScoreCvApplyData): Promise<void> {
    const { applyId, jobId, cvId } = data;
    this.logger.log(`[processCvScoring] start applyId=${applyId}`);

    const cvIndex = this.configService.get<string>("ELASTICSEARCH_INDEX_CVS")!;
    const jobIndex = this.configService.get<string>(
      "ELASTICSEARCH_INDEX_JOBS",
    )!;

    const [cvResult, jobResult] = await Promise.all([
      this.searchService.search(cvIndex, {
        query: { ids: { values: [cvId] } },
        size: 1,
      }),
      this.searchService.search(jobIndex, {
        query: { ids: { values: [jobId] } },
        size: 1,
      }),
    ]);

    const cvDoc = cvResult?.hits?.hits?.[0]?._source ?? null;
    const jobDoc = jobResult?.hits?.hits?.[0]?._source ?? null;

    if (!cvDoc) {
      throw new Error(`CV ${cvId} not indexed in ES after 15s`);
    }
    if (!jobDoc) {
      throw new Error(`Job ${jobId} not found in ES`);
    }

    const { score, criteria } = this.calculateMatchingScore(cvDoc, jobDoc);

    await this.jobRepository.updateMatchingScore(applyId, score, criteria);

    this.logger.log(
      `[processCvScoring] done applyId=${applyId} score=${score.toFixed(2)}`,
    );
  }

  private calculateMatchingScore(
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
    const expYears: number = cv.experienceYears ?? 0;
    const expMin: number = job.experienceMin ?? 0;
    const expMax: number = job.experienceMax ?? expMin;
    let experienceScore = 0;
    if (expYears >= expMax) {
      experienceScore = 1.0;
    } else if (expYears >= expMin) {
      experienceScore = 0.8;
    } else if (expMin > 0 && expYears >= expMin * 0.7) {
      experienceScore = 0.5;
    } else {
      experienceScore = 0.2;
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
        score: skillScore,
        weight: 0.4,
        matchedSkills,
        missingSkills,
      },
      experience: {
        score: experienceScore,
        weight: 0.25,
        cvYears: expYears,
        requiredMin: expMin,
        requiredMax: expMax,
      },
      location: {
        score: locationScore,
        weight: 0.15,
        matched: locationMatched,
      },
      category: {
        score: categoryScore,
        weight: 0.1,
        matched: jobCategoryId ? cvCategories.includes(jobCategoryId) : null,
      },
      salary: {
        score: salaryScore,
        weight: 0.1,
        expected: expectedSalary,
        jobMax: salaryMax,
      },
    };

    return { score: Math.min(score * 100, 100), criteria };
  }
}
