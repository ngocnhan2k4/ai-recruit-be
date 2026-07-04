/**
 * Job ↔ CV matching thresholds and weights.
 *
 * Hard dimensions renormalize when job omits a requirement.
 * Soft boost applies only when job has no hard requirement but CV has data.
 */
export const MATCHING_WEIGHTS = {
  skill: 0.4,
  experience: 0.25,
  location: 0.15,
  category: 0.1,
  salary: 0.1,
} as const;

/** Max soft boost from experience when job does not set a range (0–100 scale). */
export const SOFT_EXPERIENCE_WEIGHT = 0.05;

/** CV years at or above this value receive full soft experience boost. */
export const SOFT_EXPERIENCE_YEARS_CAP = 5;

export const CV_COMPLETENESS_FIELD_WEIGHTS = {
  skills: 0.35,
  experience: 0.25,
  location: 0.2,
  category: 0.2,
} as const;

/** Below this: do not produce a numeric score. */
export const CV_MATCH_COMPLETENESS_MIN_FOR_SCORE = 0.2;

/** Below this: exclude from job recommendations. */
export const CV_MATCH_COMPLETENESS_MIN_FOR_RECOMMEND = 0.5;

export const CV_MATCH_CONFIDENCE_THRESHOLDS = {
  medium: 0.5,
  high: 0.8,
} as const;

export const RECOMMENDED_CV_MIN_MATCHING_SCORE = 50;

export const RECOMMENDED_CV_SEARCH_POOL_MULTIPLIER = 3;

export const RECOMMENDED_CV_SEARCH_POOL_MIN = 30;
