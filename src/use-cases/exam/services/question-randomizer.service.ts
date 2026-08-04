import { Injectable } from "@nestjs/common";
import { Question } from "@/core";

interface RandomizeOptions {
  totalQuestions: number;
  balanceBySkill?: boolean;
  difficultyDistribution?: {
    easy: number; // percentage
    medium: number; // percentage
    hard: number; // percentage
  };
}

@Injectable()
export class QuestionRandomizerService {
  /**
   * Fisher-Yates shuffle algorithm
   */
  private fisherYatesShuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Randomize questions with optional skill balancing and difficulty distribution
   */
  randomizeQuestions(
    allQuestions: Question[],
    options: RandomizeOptions,
  ): Question[] {
    if (allQuestions.length === 0) {
      return [];
    }

    if (allQuestions.length <= options.totalQuestions) {
      return this.fisherYatesShuffle(allQuestions);
    }

    let selectedQuestions: Question[] = [];

    if (options.balanceBySkill) {
      selectedQuestions = this.selectBalancedBySkill(
        allQuestions,
        options.totalQuestions,
      );
    } else if (options.difficultyDistribution) {
      selectedQuestions = this.selectByDifficulty(
        allQuestions,
        options.totalQuestions,
        options.difficultyDistribution,
      );
    } else {
      // Simple random selection
      const shuffled = this.fisherYatesShuffle(allQuestions);
      selectedQuestions = shuffled.slice(0, options.totalQuestions);
    }

    // Final shuffle to randomize order
    return this.fisherYatesShuffle(selectedQuestions);
  }

  /**
   * Select questions balanced by skill
   */
  private selectBalancedBySkill(
    allQuestions: Question[],
    totalNeeded: number,
  ): Question[] {
    // Group questions by skill
    const questionsBySkill = new Map<string, Question[]>();
    allQuestions.forEach((q) => {
      if (!questionsBySkill.has(q.skillId)) {
        questionsBySkill.set(q.skillId, []);
      }
      questionsBySkill.get(q.skillId)!.push(q);
    });

    const skillIds = Array.from(questionsBySkill.keys());
    const questionsPerSkill = Math.floor(totalNeeded / skillIds.length);
    const remainder = totalNeeded % skillIds.length;

    const selected: Question[] = [];

    // First, try to get equal questions from each skill
    skillIds.forEach((skillId, index) => {
      const skillQuestions = questionsBySkill.get(skillId)!;
      const shuffled = this.fisherYatesShuffle(skillQuestions);
      const count = questionsPerSkill + (index < remainder ? 1 : 0);
      const toTake = Math.min(count, shuffled.length);
      selected.push(...shuffled.slice(0, toTake));
    });

    // If we still need more questions, fill from any remaining
    if (selected.length < totalNeeded) {
      const usedIds = new Set(selected.map((q) => q.id));
      const remaining = allQuestions.filter((q) => !usedIds.has(q.id));
      const shuffled = this.fisherYatesShuffle(remaining);
      const needed = totalNeeded - selected.length;
      selected.push(...shuffled.slice(0, needed));
    }

    return selected;
  }

  /**
   * Select questions by difficulty distribution
   * Note: This method is deprecated since difficulty filtering now happens at query time
   */
  private selectByDifficulty(
    allQuestions: Question[],
    totalNeeded: number,
    distribution: { easy: number; medium: number; hard: number },
  ): Question[] {
    // Group by difficulty levels (questions can have multiple levels)
    const easy = allQuestions.filter((q) =>
      q.difficultyLevels.includes("easy"),
    );
    const medium = allQuestions.filter((q) =>
      q.difficultyLevels.includes("medium"),
    );
    const hard = allQuestions.filter((q) =>
      q.difficultyLevels.includes("hard"),
    );

    // Calculate counts
    const easyCount = Math.round((totalNeeded * distribution.easy) / 100);
    const mediumCount = Math.round((totalNeeded * distribution.medium) / 100);
    const hardCount = Math.round((totalNeeded * distribution.hard) / 100);

    const selected: Question[] = [];

    // Select from each difficulty
    const shuffledEasy = this.fisherYatesShuffle(easy);
    const shuffledMedium = this.fisherYatesShuffle(medium);
    const shuffledHard = this.fisherYatesShuffle(hard);

    selected.push(...shuffledEasy.slice(0, Math.min(easyCount, easy.length)));
    selected.push(
      ...shuffledMedium.slice(0, Math.min(mediumCount, medium.length)),
    );
    selected.push(...shuffledHard.slice(0, Math.min(hardCount, hard.length)));

    // Fill remaining with any available
    if (selected.length < totalNeeded) {
      const usedIds = new Set(selected.map((q) => q.id));
      const remaining = allQuestions.filter((q) => !usedIds.has(q.id));
      const shuffled = this.fisherYatesShuffle(remaining);
      const needed = totalNeeded - selected.length;
      selected.push(...shuffled.slice(0, needed));
    }

    return selected;
  }

  /**
   * Randomize answer options for each question
   */
  randomizeOptions(questions: Question[]): Question[] {
    return questions.map((q) => ({
      ...q,
      ...this.shuffleOptionsWithKeys(q.options, q.optionKeys),
    }));
  }

  private shuffleOptionsWithKeys(options: string[], optionKeys?: string[]) {
    const keys = optionKeys ?? options.map((_, index) => String(index));
    const paired = options.map((option, index) => ({
      option,
      key: keys[index] ?? String(index),
    }));
    const shuffled = this.fisherYatesShuffle(paired);

    return {
      options: shuffled.map((item) => item.option),
      optionKeys: shuffled.map((item) => item.key),
    };
  }

  /**
   * Deterministically randomize answer options for each question.
   *
   * Unlike randomizeOptions (which uses Math.random and therefore reshuffles
   * on every call), this produces a STABLE order for a given (seedPrefix,
   * questionId) pair. Use the userTest id as the seedPrefix so an in-progress
   * exam keeps the same answer order across every refetch — including when the
   * UI language is switched and the questions are re-fetched for translation.
   */
  randomizeOptionsDeterministic(
    questions: Question[],
    seedPrefix: string,
  ): Question[] {
    return questions.map((q) => ({
      ...q,
      ...this.shuffleOptionsWithKeysSeeded(
        q.options,
        q.optionKeys,
        `${seedPrefix}:${q.id}`,
      ),
    }));
  }

  private shuffleOptionsWithKeysSeeded(
    options: string[],
    optionKeys: string[] | undefined,
    seed: string,
  ) {
    const keys = optionKeys ?? options.map((_, index) => String(index));
    const paired = options.map((option, index) => ({
      option,
      key: keys[index] ?? String(index),
    }));
    const shuffled = this.seededFisherYatesShuffle(paired, seed);

    return {
      options: shuffled.map((item) => item.option),
      optionKeys: shuffled.map((item) => item.key),
    };
  }

  /**
   * Fisher-Yates shuffle driven by a seeded PRNG so the result is stable for a
   * given seed string.
   */
  private seededFisherYatesShuffle<T>(array: T[], seed: string): T[] {
    const random = this.createSeededRandom(seed);
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Small deterministic PRNG (mulberry32) seeded from a string hash (xmur3).
   * Returns a function producing floats in [0, 1).
   */
  private createSeededRandom(seed: string): () => number {
    // xmur3 string hash -> 32-bit seed
    let h = 1779033703 ^ seed.length;
    for (let i = 0; i < seed.length; i++) {
      h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    let a = (h ^= h >>> 16) >>> 0;

    // mulberry32
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
}
