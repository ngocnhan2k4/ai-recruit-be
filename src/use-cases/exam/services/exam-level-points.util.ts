import { Question } from "@/core";

/** Scoring tiers: 0 = easy, 1 = medium, 2 = hard / advanced / expert */
export const DIFFICULTY_RANK: Record<string, number> = {
  easy: 0,
  medium: 1,
  hard: 2,
  advanced: 3,
  expert: 4,
};

/**
 * Map a question to a single scoring tier using the hardest tag on the question.
 */
export function getQuestionScoringTier(question: Question): 0 | 1 | 2 {
  const levels = question.difficultyLevels ?? [];
  let maxR = -1;
  for (const d of levels) {
    const r = DIFFICULTY_RANK[d as string];
    if (r !== undefined) maxR = Math.max(maxR, r);
  }
  if (maxR <= 0) return 0;
  if (maxR === 1) return 1;
  return 2;
}

function mapDifficultyStringToTier(d: string): 0 | 1 | 2 {
  const r = DIFFICULTY_RANK[d];
  if (r === undefined) return 0;
  if (r <= 0) return 0;
  if (r === 1) return 1;
  return 2;
}

/**
 * Weight multipliers per tier [w0, w1, w2] based on what the user selected when starting the exam.
 * - No selection (random mix): [1, 2, 4]
 * - One level: uniform → effectively [1,1,1] (only one tier populated)
 * - Two levels: lower tier ×1, higher tier ×2
 * - Three or more levels: [1, 2, 4]
 */
export function tierWeightsFromSelection(
  selectedDifficultyLevels: string[] | null | undefined,
): [number, number, number] {
  const s = (selectedDifficultyLevels ?? [])
    .filter(Boolean)
    .sort((a, b) => (DIFFICULTY_RANK[a] ?? 0) - (DIFFICULTY_RANK[b] ?? 0));

  if (s.length === 0) return [1, 2, 4];
  if (s.length === 1) return [1, 1, 1];
  if (s.length === 2) {
    const t0 = mapDifficultyStringToTier(s[0]);
    const t1 = mapDifficultyStringToTier(s[1]);
    const w: [number, number, number] = [0, 0, 0];
    w[t0] = 1;
    w[t1] = 2;
    return w;
  }
  return [1, 2, 4];
}

/**
 * Integer points per question if answered correctly. Sum is exactly 100.
 */
export function allocateExamPoints(
  questions: Question[],
  selectedDifficultyLevels: string[] | null | undefined,
): Map<string, number> {
  const n = questions.length;
  if (n === 0) return new Map();

  const w = tierWeightsFromSelection(selectedDifficultyLevels);
  const counts: [number, number, number] = [0, 0, 0];
  const tiers = questions.map((q) => {
    const t = getQuestionScoringTier(q);
    counts[t]++;
    return t;
  });

  const denom = counts[0] * w[0] + counts[1] * w[1] + counts[2] * w[2];
  if (denom === 0) {
    const raw = questions.map(() => 100 / n);
    return distributeIntegerPoints(
      questions.map((q) => q.id),
      raw,
    );
  }

  const raw = questions.map((_, i) => {
    const t = tiers[i];
    return (100 * w[t]) / denom;
  });

  return distributeIntegerPoints(
    questions.map((q) => q.id),
    raw,
  );
}

/**
 * Largest remainder method so values are integers and sum to 100.
 */
function distributeIntegerPoints(
  questionIds: string[],
  raw: number[],
): Map<string, number> {
  const floors = raw.map((r) => Math.floor(r));
  const sumFloors = floors.reduce((a, b) => a + b, 0);
  const remainder = 100 - sumFloors;

  const indexed = raw.map((r, i) => ({
    i,
    frac: r - Math.floor(r),
  }));
  indexed.sort((a, b) => b.frac - a.frac);

  const points = [...floors];
  for (let k = 0; k < remainder; k++) {
    points[indexed[k % indexed.length].i]++;
  }

  const map = new Map<string, number>();
  questionIds.forEach((id, i) => {
    map.set(id, points[i]);
  });
  return map;
}
