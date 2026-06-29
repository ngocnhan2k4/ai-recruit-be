import {
  computeCvCompleteness,
  computeMatchingScore,
} from "./matching-score.util";

describe("computeCvCompleteness", () => {
  it("returns 0 when CV has no extracted fields", () => {
    const result = computeCvCompleteness({});
    expect(result.completeness).toBe(0);
    expect(result.missingFields).toEqual([
      "skills",
      "experience",
      "location",
      "category",
    ]);
  });

  it("returns partial completeness when only skills are present", () => {
    const result = computeCvCompleteness({ skillIds: ["s1"] });
    expect(result.completeness).toBe(0.35);
  });
});

describe("computeMatchingScore", () => {
  const emptyCv = {
    skillIds: [],
    provinceIds: [],
    categoryIds: [],
  };

  const jobWithRequirements = {
    skillIds: ["skill-a", "skill-b"],
    provinceIds: ["prov-a"],
    categoryId: "cat-a",
    experienceMin: 1,
    experienceMax: 3,
    salaryMax: 30,
  };

  it("returns null score when CV completeness is below threshold", () => {
    const result = computeMatchingScore(emptyCv, jobWithRequirements);
    expect(result.score).toBeNull();
    expect(result.criteria.scoreUnavailable).toBe(true);
  });

  it("scores 0 for sparse CV against job with active hard dimensions (dev case)", () => {
    const cv = {
      skillIds: ["s1"],
      provinceIds: [],
      categoryIds: [],
      experienceYears: null,
    };
    const job = {
      skillIds: ["skill-x"],
      provinceIds: ["prov-x"],
      categoryId: "cat-x",
      experienceMin: null,
      experienceMax: null,
      salaryMax: null,
    };

    const result = computeMatchingScore(cv, job);
    expect(result.score).toBe(0);
    expect(result.criteria.hardScore).toBe(0);
    expect(result.criteria.softBoost).toBe(0);
  });

  it("still scores experience when other dimensions mismatch", () => {
    const cv = {
      skillIds: ["other"],
      provinceIds: ["other-prov"],
      categoryIds: ["other-cat"],
      experienceYears: 1,
      expectedSalary: 50,
    };

    const result = computeMatchingScore(cv, jobWithRequirements);
    expect(result.score).toBe(23);
    expect(result.criteria.hardScore).toBe(23);
  });

  it("applies soft experience boost when job has no experience range", () => {
    const cvOneYear = {
      skillIds: ["skill-a"],
      provinceIds: ["prov-a"],
      categoryIds: ["cat-a"],
      experienceYears: 1,
    };
    const cvTwoYears = {
      skillIds: ["skill-a"],
      provinceIds: ["prov-a"],
      categoryIds: ["cat-a"],
      experienceYears: 2,
    };
    const job = {
      skillIds: ["skill-a", "skill-b"],
      provinceIds: ["prov-a"],
      categoryId: "cat-a",
      experienceMin: null,
      experienceMax: null,
      salaryMax: null,
    };

    const oneYear = computeMatchingScore(cvOneYear, job);
    const twoYears = computeMatchingScore(cvTwoYears, job);

    expect(oneYear.score).not.toBeNull();
    expect(twoYears.score).not.toBeNull();
    expect(twoYears.score!).toBeGreaterThan(oneYear.score!);
    expect(oneYear.criteria.experience.softApplied).toBe(true);
    expect(oneYear.criteria.softBoost).toBe(1);
    expect(twoYears.criteria.softBoost).toBe(2);
  });

  it("includes dimension contributions that sum to the final score", () => {
    const result = computeMatchingScore(
      {
        skillIds: ["skill-a"],
        provinceIds: ["prov-a"],
        categoryIds: ["cat-a"],
        experienceYears: 2,
        expectedSalary: 25,
      },
      jobWithRequirements,
    );

    const contributions = Object.values(
      result.criteria.dimensions ?? {},
    ).reduce((sum, dim) => sum + dim.contribution, 0);

    expect(result.score).not.toBeNull();
    expect(contributions).toBeCloseTo(result.score!, 1);
  });
});
