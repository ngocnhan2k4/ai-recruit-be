import {
  CV_COMPLETENESS_FIELD_WEIGHTS,
  CV_MATCH_COMPLETENESS_MIN_FOR_SCORE,
  CV_MATCH_CONFIDENCE_THRESHOLDS,
  MATCHING_WEIGHTS,
  SOFT_EXPERIENCE_WEIGHT,
  SOFT_EXPERIENCE_YEARS_CAP,
} from "@/common/constants/job-matching";

export { MATCHING_WEIGHTS } from "@/common/constants/job-matching";

export type DimensionMode = "hard" | "soft" | "skip";
export type MatchConfidence = "low" | "medium" | "high";
export type CvCompletenessField = keyof typeof CV_COMPLETENESS_FIELD_WEIGHTS;

export interface DimensionScoreDetail {
  mode: DimensionMode;
  raw: number | null;
  weight: number;
  contribution: number;
  skipped: boolean;
}

export interface MatchingCriteriaResult {
  skill: {
    matchedSkills: string[];
    missingSkills: string[];
    skipped?: boolean;
  };
  experience: {
    cvYears: number | null;
    requiredMin: number | null;
    requiredMax: number | null;
    skipped?: boolean;
    softApplied?: boolean;
  };
  location: {
    matched: boolean | null;
    skipped?: boolean;
  };
  category: {
    matched: boolean | null;
    skipped?: boolean;
  };
  salary: {
    expected: number | null;
    jobMax: number | null;
    skipped?: boolean;
  };
  dimensions?: {
    skill: DimensionScoreDetail;
    experience: DimensionScoreDetail;
    location: DimensionScoreDetail;
    category: DimensionScoreDetail;
    salary: DimensionScoreDetail;
  };
  hardScore?: number;
  softBoost?: number;
  completeness?: number;
  missingFields?: CvCompletenessField[];
  confidence?: MatchConfidence;
  insufficientCriteria?: boolean;
  scoreUnavailable?: boolean;
}

export interface MatchingScoreResult {
  score: number | null;
  criteria: MatchingCriteriaResult;
}

export function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function computeCvCompleteness(cv: Record<string, any>): {
  completeness: number;
  missingFields: CvCompletenessField[];
} {
  const missingFields: CvCompletenessField[] = [];
  let completeness = 0;

  if ((cv.skillIds || []).length > 0) {
    completeness += CV_COMPLETENESS_FIELD_WEIGHTS.skills;
  } else {
    missingFields.push("skills");
  }

  if (toNullableNumber(cv.experienceYears) !== null) {
    completeness += CV_COMPLETENESS_FIELD_WEIGHTS.experience;
  } else {
    missingFields.push("experience");
  }

  if ((cv.provinceIds || []).length > 0) {
    completeness += CV_COMPLETENESS_FIELD_WEIGHTS.location;
  } else {
    missingFields.push("location");
  }

  if ((cv.categoryIds || []).length > 0) {
    completeness += CV_COMPLETENESS_FIELD_WEIGHTS.category;
  } else {
    missingFields.push("category");
  }

  return {
    completeness: Number(completeness.toFixed(2)),
    missingFields,
  };
}

function resolveConfidence(completeness: number): MatchConfidence {
  if (completeness >= CV_MATCH_CONFIDENCE_THRESHOLDS.high) {
    return "high";
  }
  if (completeness >= CV_MATCH_CONFIDENCE_THRESHOLDS.medium) {
    return "medium";
  }
  return "low";
}

function scoreExperienceHard(
  expYears: number | null,
  expMin: number,
  expMax: number,
): number {
  if (expYears === null) {
    return 0;
  }
  if (expYears >= expMax) {
    return 1.0;
  }
  if (expYears >= expMin) {
    return 0.8;
  }
  if (expMin > 0 && expYears >= expMin * 0.7) {
    return 0.5;
  }
  return 0.2;
}

function scoreSalary(expectedSalary: number, salaryMax: number): number {
  if (expectedSalary <= salaryMax * 1.2) {
    return 1.0;
  }
  if (expectedSalary <= salaryMax * 1.5) {
    return 0.7;
  }
  return 0.3;
}

function buildSkippedDetail(weight: number): DimensionScoreDetail {
  return {
    mode: "skip",
    raw: null,
    weight,
    contribution: 0,
    skipped: true,
  };
}

function buildHardDetail(
  raw: number,
  weight: number,
  totalHardWeight: number,
): DimensionScoreDetail {
  const contribution = ((raw * weight) / totalHardWeight) * 100;
  return {
    mode: "hard",
    raw,
    weight,
    contribution: Number(contribution.toFixed(2)),
    skipped: false,
  };
}

export function computeMatchingScore(
  cv: Record<string, any>,
  job: Record<string, any>,
): MatchingScoreResult {
  const { completeness, missingFields } = computeCvCompleteness(cv);
  const confidence = resolveConfidence(completeness);

  const cvSkills: string[] = cv.skillIds || [];
  const jobSkills: string[] = job.skillIds || [];
  const matchedSkills = cvSkills.filter((s) => jobSkills.includes(s));
  const missingSkills = jobSkills.filter((s) => !cvSkills.includes(s));

  const expYears = toNullableNumber(cv.experienceYears);
  const expMin = toNullableNumber(job.experienceMin);
  const expMax = toNullableNumber(job.experienceMax);
  const hasExperienceRequirement = expMin !== null && expMax !== null;

  const cvProvinces: string[] = cv.provinceIds || [];
  const jobProvinces: string[] = job.provinceIds || [];
  const hasLocationRequirement = jobProvinces.length > 0;

  const cvCategories: string[] = cv.categoryIds || [];
  const jobCategoryId: string = job.categoryId || "";
  const hasCategoryRequirement = Boolean(jobCategoryId);

  const expectedSalary = toNullableNumber(cv.expectedSalary);
  const salaryMax = toNullableNumber(job.salaryMax);
  const hasSalaryRequirement = salaryMax !== null;

  const baseCriteria: MatchingCriteriaResult = {
    skill: { matchedSkills, missingSkills },
    experience: {
      cvYears: expYears,
      requiredMin: expMin,
      requiredMax: expMax,
    },
    location: { matched: null },
    category: { matched: null },
    salary: { expected: expectedSalary, jobMax: salaryMax },
    completeness,
    missingFields,
    confidence,
  };

  if (completeness < CV_MATCH_COMPLETENESS_MIN_FOR_SCORE) {
    return {
      score: null,
      criteria: {
        ...baseCriteria,
        scoreUnavailable: true,
        dimensions: {
          skill: buildSkippedDetail(MATCHING_WEIGHTS.skill),
          experience: buildSkippedDetail(MATCHING_WEIGHTS.experience),
          location: buildSkippedDetail(MATCHING_WEIGHTS.location),
          category: buildSkippedDetail(MATCHING_WEIGHTS.category),
          salary: buildSkippedDetail(MATCHING_WEIGHTS.salary),
        },
      },
    };
  }

  const hardDimensions: {
    key: keyof typeof MATCHING_WEIGHTS;
    raw: number;
    weight: number;
  }[] = [];

  const skillSkipped = jobSkills.length === 0;
  if (!skillSkipped) {
    hardDimensions.push({
      key: "skill",
      raw: matchedSkills.length / jobSkills.length,
      weight: MATCHING_WEIGHTS.skill,
    });
    baseCriteria.skill.skipped = false;
  } else {
    baseCriteria.skill.skipped = true;
  }

  const experienceHardSkipped = !hasExperienceRequirement;
  if (!experienceHardSkipped) {
    hardDimensions.push({
      key: "experience",
      raw: scoreExperienceHard(expYears, expMin, expMax),
      weight: MATCHING_WEIGHTS.experience,
    });
    baseCriteria.experience.skipped = false;
  } else {
    baseCriteria.experience.skipped = true;
  }

  let locationMatched: boolean | null = null;
  const locationSkipped = !hasLocationRequirement;
  if (!locationSkipped) {
    locationMatched = cvProvinces.some((p) => jobProvinces.includes(p));
    hardDimensions.push({
      key: "location",
      raw: locationMatched ? 1.0 : 0.0,
      weight: MATCHING_WEIGHTS.location,
    });
    baseCriteria.location = { matched: locationMatched, skipped: false };
  } else {
    baseCriteria.location = { matched: null, skipped: true };
  }

  let categoryMatched: boolean | null = null;
  const categorySkipped = !hasCategoryRequirement;
  if (!categorySkipped) {
    categoryMatched = cvCategories.includes(jobCategoryId);
    hardDimensions.push({
      key: "category",
      raw: categoryMatched ? 1.0 : 0.0,
      weight: MATCHING_WEIGHTS.category,
    });
    baseCriteria.category = { matched: categoryMatched, skipped: false };
  } else {
    baseCriteria.category = { matched: null, skipped: true };
  }

  const salarySkipped = !hasSalaryRequirement;
  if (!salarySkipped) {
    hardDimensions.push({
      key: "salary",
      raw: expectedSalary === null ? 0 : scoreSalary(expectedSalary, salaryMax),
      weight: MATCHING_WEIGHTS.salary,
    });
    baseCriteria.salary.skipped = false;
  } else {
    baseCriteria.salary.skipped = true;
  }

  const insufficientCriteria = hardDimensions.length === 0;
  let hardScore = 0;
  if (!insufficientCriteria) {
    const totalHardWeight = hardDimensions.reduce(
      (sum, d) => sum + d.weight,
      0,
    );
    const weighted = hardDimensions.reduce(
      (sum, d) => sum + d.raw * d.weight,
      0,
    );
    hardScore = (weighted / totalHardWeight) * 100;
  }

  let softBoost = 0;
  let experienceDetail: DimensionScoreDetail = buildSkippedDetail(
    MATCHING_WEIGHTS.experience,
  );

  if (experienceHardSkipped && expYears !== null) {
    const softRaw = Math.min(expYears / SOFT_EXPERIENCE_YEARS_CAP, 1);
    softBoost = softRaw * SOFT_EXPERIENCE_WEIGHT * 100;
    experienceDetail = {
      mode: "soft",
      raw: Number(softRaw.toFixed(2)),
      weight: SOFT_EXPERIENCE_WEIGHT,
      contribution: Number(softBoost.toFixed(2)),
      skipped: false,
    };
    baseCriteria.experience.softApplied = true;
  }

  const totalHardWeight = hardDimensions.reduce((sum, d) => sum + d.weight, 0);

  const dimensions: MatchingCriteriaResult["dimensions"] = {
    skill: skillSkipped
      ? buildSkippedDetail(MATCHING_WEIGHTS.skill)
      : buildHardDetail(
          hardDimensions.find((d) => d.key === "skill")!.raw,
          MATCHING_WEIGHTS.skill,
          totalHardWeight,
        ),
    experience: !experienceHardSkipped
      ? buildHardDetail(
          hardDimensions.find((d) => d.key === "experience")!.raw,
          MATCHING_WEIGHTS.experience,
          totalHardWeight,
        )
      : experienceDetail,
    location: locationSkipped
      ? buildSkippedDetail(MATCHING_WEIGHTS.location)
      : buildHardDetail(
          hardDimensions.find((d) => d.key === "location")!.raw,
          MATCHING_WEIGHTS.location,
          totalHardWeight,
        ),
    category: categorySkipped
      ? buildSkippedDetail(MATCHING_WEIGHTS.category)
      : buildHardDetail(
          hardDimensions.find((d) => d.key === "category")!.raw,
          MATCHING_WEIGHTS.category,
          totalHardWeight,
        ),
    salary: salarySkipped
      ? buildSkippedDetail(MATCHING_WEIGHTS.salary)
      : buildHardDetail(
          hardDimensions.find((d) => d.key === "salary")!.raw,
          MATCHING_WEIGHTS.salary,
          totalHardWeight,
        ),
  };

  const finalScore = insufficientCriteria
    ? Number(softBoost.toFixed(2))
    : Number(Math.min(hardScore + softBoost, 100).toFixed(2));

  return {
    score: finalScore,
    criteria: {
      ...baseCriteria,
      dimensions,
      hardScore: Number(hardScore.toFixed(2)),
      softBoost: Number(softBoost.toFixed(2)),
      ...(insufficientCriteria ? { insufficientCriteria: true } : {}),
    },
  };
}
