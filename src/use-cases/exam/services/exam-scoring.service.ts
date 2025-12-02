import { Injectable } from "@nestjs/common";
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
  levelAssessed: string | null;
  levelName: string;
}

@Injectable()
export class ExamScoringService {
  constructor(private readonly levelRepo: ILevelRepository) {}

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
   * Evaluate level based on score
   */
  async evaluateLevel(
    areaId: string,
    totalScore: number,
  ): Promise<{ levelId: string | null; levelName: string }> {
    const level = await this.levelRepo.findLevelByScore(areaId, totalScore);

    if (level) {
      return {
        levelId: level.id,
        levelName: level.levelName,
      };
    }

    // Default level if no match found
    return {
      levelId: null,
      levelName: "Not Assessed",
    };
  }

  /**
   * Calculate score and evaluate level
   */
  async scoreAndEvaluate(
    areaId: string,
    questions: Question[],
    answers: Array<{ questionId: string; chosenAnswer: string }>,
  ): Promise<ExamResult> {
    const scoringResult = this.calculateScore(questions, answers);
    const levelResult = await this.evaluateLevel(
      areaId,
      scoringResult.totalScore,
    );

    return {
      ...scoringResult,
      levelAssessed: levelResult.levelId,
      levelName: levelResult.levelName,
    };
  }
}
