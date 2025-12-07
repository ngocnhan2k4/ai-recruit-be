import { Injectable, Logger } from "@nestjs/common";
import { ILevelRepository, Question } from "@/core";

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
  constructor(private readonly levelRepo: ILevelRepository) {}

  private readonly logger = new Logger(ExamScoringService.name);

  /**
   * Calculate score from user answers
   */
  calculateScore(
    questions: Question[],
    answers: Array<{ questionId: string; chosenAnswer: string }>,
  ): ScoringResult {
    const questionMap = new Map(questions.map((q) => [q.id, q]));
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

      const pointGained = isCorrect ? question.point : 0;

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
   * Evaluate level per skill based on percentage correct
   */
  evaluateSkillLevels(
    questions: Question[],
    answersDetails: Array<{ questionId: string; isCorrect: boolean }>,
  ): Record<string, string> {
    // Group questions by skill
    const questionsBySkill = new Map<string, Question[]>();
    questions.forEach((q) => {
      if (!questionsBySkill.has(q.skillId)) {
        questionsBySkill.set(q.skillId, []);
      }
      questionsBySkill.get(q.skillId)!.push(q);
    });

    const skillLevels: Record<string, string> = {};

    // Calculate percentage correct per skill
    questionsBySkill.forEach((skillQuestions, skillId) => {
      const skillQuestionIds = new Set(skillQuestions.map((q) => q.id));
      const skillAnswers = answersDetails.filter((a) =>
        skillQuestionIds.has(a.questionId),
      );

      const correctCount = skillAnswers.filter((a) => a.isCorrect).length;
      const totalCount = skillAnswers.length;

      // Skip skills with no answers
      if (totalCount === 0) {
        return;
      }

      const percentage = Math.round((correctCount / totalCount) * 100);

      // Assign level based on percentage thresholds
      // Require minimum questions for reliable assessment
      // For development: allow assessment with fewer questions, but cap the level
      let level = "Beginner";
      if (totalCount < 5) {
        // With very few questions, cap at Intermediate to avoid over-assessment
        if (percentage >= 60) level = "Intermediate";
        else if (percentage >= 40) level = "Basic";
        else level = "Beginner";
      } else if (totalCount < 10) {
        // With 5-9 questions, cap at Advanced
        if (percentage >= 75) level = "Advanced";
        else if (percentage >= 60) level = "Intermediate";
        else if (percentage >= 40) level = "Basic";
        else level = "Beginner";
      } else {
        // With 10+ questions, use full scale
        if (percentage >= 90) level = "Expert";
        else if (percentage >= 75) level = "Advanced";
        else if (percentage >= 60) level = "Intermediate";
        else if (percentage >= 40) level = "Basic";
        else level = "Beginner";
      }

      this.logger.debug(
        `Skill ${skillId}: ${correctCount}/${totalCount} correct (${percentage}%) -> ${level}`,
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
  ): ExamResult {
    const scoringResult = this.calculateScore(questions, answers);
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
