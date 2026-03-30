import { Injectable, Logger } from "@nestjs/common";
import { Question } from "@/core";
import { allocateExamPoints } from "./exam-level-points.util";

export interface ScoringResult {
  totalScore: number;
  correctAnswers: number;
  incorrectAnswers: number;
  answersDetails: Array<{
    questionId: string;
    isCorrect: boolean;
    pointGained: number;
  }>;
}

export interface ExamResult extends ScoringResult {
  skillLevelsAssessed: Record<string, string>;
}

@Injectable()
export class ExamScoringService {
  private readonly logger = new Logger(ExamScoringService.name);

  /**
   * Calculate score from user answers (max 100 per exam; points per question depend on difficulty tier).
   */
  calculateScore(
    questions: Question[],
    answers: Array<{ questionId: string; chosenAnswer: string }>,
    selectedDifficultyLevels: string[] | null | undefined,
  ): ScoringResult {
    const questionMap = new Map(questions.map((q) => [q.id, q]));
    const pointsIfCorrect = allocateExamPoints(
      questions,
      selectedDifficultyLevels,
    );

    let totalScore = 0;
    let correctAnswers = 0;
    let incorrectAnswers = 0;

    const answersDetails = answers.map((answer) => {
      const question = questionMap.get(answer.questionId);
      if (!question) {
        return {
          questionId: answer.questionId,
          isCorrect: false,
          pointGained: 0,
        };
      }

      const isCorrect =
        answer.chosenAnswer.trim().toLowerCase() ===
        question.correctAnswer.trim().toLowerCase();

      const maxPoints = pointsIfCorrect.get(question.id) ?? 0;
      const pointGained = isCorrect ? maxPoints : 0;

      if (isCorrect) {
        correctAnswers++;
        totalScore += pointGained;
      } else {
        incorrectAnswers++;
      }

      return {
        questionId: answer.questionId,
        isCorrect,
        pointGained,
      };
    });

    return {
      totalScore,
      correctAnswers,
      incorrectAnswers,
      answersDetails,
    };
  }

  /**
   * Determine the highest difficulty ceiling for a set of questions.
   *   easy only          → "Beginner"
   *   up to medium       → "Intermediate"
   *   hard/advanced/exp  → "Advanced"
   */
  private difficultyToCeiling(questions: Question[]): string {
    const HARD_TAGS = new Set(["hard", "advanced", "expert"]);
    const MEDIUM_TAGS = new Set(["medium"]);

    let hasHard = false;
    let hasMedium = false;

    for (const q of questions) {
      for (const d of q.difficultyLevels ?? []) {
        if (HARD_TAGS.has(d)) hasHard = true;
        if (MEDIUM_TAGS.has(d)) hasMedium = true;
      }
    }

    if (hasHard) return "Advanced";
    if (hasMedium) return "Intermediate";
    return "Beginner";
  }

  /**
   * Evaluate level per skill based on BOTH the % correct AND the difficulty ceiling.
   *
   * ceiling = "Beginner"     → always Beginner (regardless of score)
   * ceiling = "Intermediate" → score >= 75% → Intermediate, else Beginner
   * ceiling = "Advanced"     → score >= 75% → Advanced
   *                            score >= 50% → Intermediate
   *                            else         → Beginner
   */
  evaluateSkillLevels(
    questions: Question[],
    answersDetails: Array<{ questionId: string; isCorrect: boolean }>,
  ): Record<string, string> {
    const questionsBySkill = new Map<string, Question[]>();
    questions.forEach((q) => {
      if (!questionsBySkill.has(q.skillId)) {
        questionsBySkill.set(q.skillId, []);
      }
      questionsBySkill.get(q.skillId)!.push(q);
    });

    const skillLevels: Record<string, string> = {};

    questionsBySkill.forEach((skillQuestions, skillId) => {
      const skillQuestionIds = new Set(skillQuestions.map((q) => q.id));
      const skillAnswers = answersDetails.filter((a) =>
        skillQuestionIds.has(a.questionId),
      );

      const correctCount = skillAnswers.filter((a) => a.isCorrect).length;
      const totalCount = skillAnswers.length;

      if (totalCount === 0) return;

      const pct = Math.round((correctCount / totalCount) * 100);
      const ceiling = this.difficultyToCeiling(skillQuestions);

      let level = "Beginner";

      if (ceiling === "Beginner") {
        // Only easy questions → best achievable is Beginner
        level = "Beginner";
      } else if (ceiling === "Intermediate") {
        // Medium in mix → top out at Intermediate
        level = pct >= 75 ? "Intermediate" : "Beginner";
      } else {
        // Hard / Advanced in mix → full 3-tier ladder
        if (pct >= 75) level = "Advanced";
        else if (pct >= 50) level = "Intermediate";
        else level = "Beginner";
      }

      this.logger.debug(
        `Skill ${skillId}: ${correctCount}/${totalCount} (${pct}%), ceiling=${ceiling} -> ${level}`,
      );

      skillLevels[skillId] = level;
    });

    return skillLevels;
  }

  /**
   * Calculate score and evaluate per-skill levels
   */
  scoreAndEvaluate(
    questions: Question[],
    answers: Array<{ questionId: string; chosenAnswer: string }>,
    selectedDifficultyLevels: string[] | null | undefined,
  ): ExamResult {
    const scoringResult = this.calculateScore(
      questions,
      answers,
      selectedDifficultyLevels,
    );
    const skillLevels = this.evaluateSkillLevels(
      questions,
      scoringResult.answersDetails,
    );

    return {
      ...scoringResult,
      skillLevelsAssessed: skillLevels,
    };
  }
}
