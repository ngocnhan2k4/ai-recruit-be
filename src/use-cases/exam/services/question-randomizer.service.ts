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
   */
  private selectByDifficulty(
    allQuestions: Question[],
    totalNeeded: number,
    distribution: { easy: number; medium: number; hard: number },
  ): Question[] {
    // Group by difficulty
    const easy = allQuestions.filter((q) => q.difficulty === "easy");
    const medium = allQuestions.filter((q) => q.difficulty === "medium");
    const hard = allQuestions.filter((q) => q.difficulty === "hard");

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
      options: this.fisherYatesShuffle([...q.options]),
    }));
  }
}
