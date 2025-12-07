import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import {
  IAreaRepository,
  IQuestionRepository,
  ILevelRepository,
  IUserTestRepository,
  IUserAnswerRepository,
  IImportLogRepository,
  Question,
} from "@/core";
import {
  CreateAreaDto,
  UpdateAreaDto,
  CreateQuestionDto,
  UpdateQuestionDto,
  ToggleQuestionStatusDto,
  QueryQuestionsDto,
  CreateLevelDto,
  UpdateLevelDto,
  StartExamDto,
  SubmitExamDto,
  ImportResultDto,
} from "../../interfaces/dtos/exam";
import {
  QuestionImportService,
  QuestionRandomizerService,
  ExamScoringService,
  ImportRow,
} from "./services";

@Injectable()
export class ExamUseCases {
  private readonly logger = new Logger(ExamUseCases.name);

  constructor(
    private readonly areaRepo: IAreaRepository,
    private readonly questionRepo: IQuestionRepository,
    private readonly levelRepo: ILevelRepository,
    private readonly userTestRepo: IUserTestRepository,
    private readonly userAnswerRepo: IUserAnswerRepository,
    private readonly importLogRepo: IImportLogRepository,
    private readonly importService: QuestionImportService,
    private readonly randomizerService: QuestionRandomizerService,
    private readonly scoringService: ExamScoringService,
  ) {}

  // ==================== AREA MANAGEMENT ====================

  async createArea(dto: CreateAreaDto) {
    const area = await this.areaRepo.create(dto);
    this.logger.log(`Created area: ${area.id}`);
    return {
      success: true,
      message: "Area created successfully",
      data: area,
    };
  }

  async updateArea(id: string, dto: UpdateAreaDto) {
    const existing = await this.areaRepo.get(id);
    if (!existing) {
      throw new NotFoundException("Area not found");
    }

    const [updated] = await this.areaRepo.update({ id }, dto);
    this.logger.log(`Updated area: ${id}`);
    return {
      success: true,
      message: "Area updated successfully",
      data: updated,
    };
  }

  async deleteArea(id: string) {
    const existing = await this.areaRepo.get(id);
    if (!existing) {
      throw new NotFoundException("Area not found");
    }

    await this.areaRepo.deletePermanently({ id });
    this.logger.log(`Deleted area: ${id}`);
    return {
      success: true,
      message: "Area deleted successfully",
      data: null,
    };
  }

  async getAreas(query: { page?: number; limit?: number; keyword?: string }) {
    const result = await this.areaRepo.getPaginatedAreas({
      page: query.page,
      limit: query.limit ?? 20,
      keyword: query.keyword,
    });
    return {
      success: true,
      message: "Areas fetched successfully",
      data: result,
    };
  }

  async getAreaById(id: string) {
    const area = await this.areaRepo.get(id);
    if (!area) {
      throw new NotFoundException("Area not found");
    }

    return {
      success: true,
      message: "Area fetched successfully",
      data: area,
    };
  }

  // ==================== QUESTION MANAGEMENT ====================

  async createQuestion(dto: CreateQuestionDto) {
    const question = await this.questionRepo.create(dto as Partial<Question>);
    this.logger.log(`Created question: ${question.id}`);
    return {
      success: true,
      message: "Question created successfully",
      data: question,
    };
  }

  async updateQuestion(id: string, dto: UpdateQuestionDto) {
    const existing = await this.questionRepo.get(id);
    if (!existing) {
      throw new NotFoundException("Question not found");
    }

    const [updated] = await this.questionRepo.update(
      { id },
      dto as Partial<Question>,
    );
    this.logger.log(`Updated question: ${id}`);
    return {
      success: true,
      message: "Question updated successfully",
      data: updated,
    };
  }

  async deleteQuestion(id: string) {
    const existing = await this.questionRepo.get(id);
    if (!existing) {
      throw new NotFoundException("Question not found");
    }

    await this.questionRepo.deletePermanently({ id });
    this.logger.log(`Deleted question: ${id}`);
    return {
      success: true,
      message: "Question deleted successfully",
      data: null,
    };
  }

  async toggleQuestionStatus(id: string, dto: ToggleQuestionStatusDto) {
    const existing = await this.questionRepo.get(id);
    if (!existing) {
      throw new NotFoundException("Question not found");
    }

    const updated = await this.questionRepo.toggleActive(id, dto.isActive);
    this.logger.log(`Toggled question status: ${id} -> ${dto.isActive}`);
    return {
      success: true,
      message: "Question status updated successfully",
      data: updated,
    };
  }

  async getQuestions(query: QueryQuestionsDto) {
    const result = await this.questionRepo.getPaginatedQuestions({
      ...query,
      limit: query.limit ?? 20,
    });
    return {
      success: true,
      message: "Questions fetched successfully",
      data: result,
    };
  }

  async getQuestionById(id: string) {
    const question = await this.questionRepo.get(id);
    if (!question) {
      throw new NotFoundException("Question not found");
    }

    return {
      success: true,
      message: "Question fetched successfully",
      data: question,
    };
  }

  // ==================== QUESTION IMPORT ====================

  async importQuestionsCSV(
    fileContent: string,
    fileName: string,
  ): Promise<{ success: boolean; message: string; data: ImportResultDto }> {
    const result = await this.importService.importFromCSV(
      fileContent,
      fileName,
    );
    this.logger.log(
      `Imported ${result.successRows}/${result.totalRows} questions from CSV`,
    );
    return {
      success: true,
      message: "Questions imported successfully",
      data: result,
    };
  }

  async importQuestionsJSON(
    data: ImportRow[],
    fileName: string,
  ): Promise<{ success: boolean; message: string; data: ImportResultDto }> {
    const result = await this.importService.importFromJSON(data, fileName);
    this.logger.log(
      `Imported ${result.successRows}/${result.totalRows} questions from JSON`,
    );
    return {
      success: true,
      message: "Questions imported successfully",
      data: result,
    };
  }

  async getImportLogs(limit: number = 10) {
    const logs = await this.importLogRepo.getRecentLogs(limit);
    return {
      success: true,
      message: "Import logs fetched successfully",
      data: logs,
    };
  }

  // ==================== LEVEL MANAGEMENT ====================

  async createLevel(dto: CreateLevelDto) {
    // Validate area exists
    const area = await this.areaRepo.get(dto.areaId);
    if (!area) {
      throw new NotFoundException("Area not found");
    }

    // Validate min/max range
    if (dto.minScore > dto.maxScore) {
      throw new BadRequestException("minScore cannot be greater than maxScore");
    }

    const level = await this.levelRepo.create(dto);
    this.logger.log(`Created level: ${level.id}`);
    return {
      success: true,
      message: "Level created successfully",
      data: level,
    };
  }

  async updateLevel(id: string, dto: UpdateLevelDto) {
    const existing = await this.levelRepo.get(id);
    if (!existing) {
      throw new NotFoundException("Level not found");
    }

    if (dto.minScore && dto.maxScore && dto.minScore > dto.maxScore) {
      throw new BadRequestException("minScore cannot be greater than maxScore");
    }

    const [updated] = await this.levelRepo.update({ id }, dto);
    this.logger.log(`Updated level: ${id}`);
    return {
      success: true,
      message: "Level updated successfully",
      data: updated,
    };
  }

  async deleteLevel(id: string) {
    const existing = await this.levelRepo.get(id);
    if (!existing) {
      throw new NotFoundException("Level not found");
    }

    await this.levelRepo.deletePermanently({ id });
    this.logger.log(`Deleted level: ${id}`);
    return {
      success: true,
      message: "Level deleted successfully",
      data: null,
    };
  }

  async getLevelsByArea(areaId: string) {
    const area = await this.areaRepo.get(areaId);
    if (!area) {
      throw new NotFoundException("Area not found");
    }

    const levels = await this.levelRepo.getLevelsByArea(areaId);
    return {
      success: true,
      message: "Levels fetched successfully",
      data: levels,
    };
  }

  // ==================== EXAM FLOW ====================

  async startExam(userId: string, dto: StartExamDto) {
    // Fetch all active questions for single skill and optional difficulty levels
    const allQuestions = await this.questionRepo.getActiveQuestionsBySkills(
      [dto.skillId],
      dto.difficultyLevels,
    );

    if (allQuestions.length === 0) {
      throw new BadRequestException(
        "No active questions found for selected skill and difficulty levels",
      );
    }

    // TODO: Re-enable this validation for production
    // if (allQuestions.length < 20) {
    //   throw new BadRequestException(
    //     `Not enough questions for this skill. Found ${allQuestions.length}, need 20. Try selecting different difficulty levels or contact admin.`,
    //   );
    // }

    // Randomize and select questions (use available count or 20, whichever is less)
    // For development: using all available questions if less than 20
    const questionCount = Math.min(allQuestions.length, 20);
    const selectedQuestions = this.randomizerService.randomizeQuestions(
      allQuestions,
      {
        totalQuestions: questionCount,
        balanceBySkill: false,
      },
    );

    // Randomize answer options
    const questionsWithRandomOptions =
      this.randomizerService.randomizeOptions(selectedQuestions);

    // Create user test record
    const userTest = await this.userTestRepo.create({
      userId,
      selectedSkillIds: [dto.skillId],
      selectedDifficultyLevels: dto.difficultyLevels as any,
    });

    // Return questions without correct answers
    const questionsForUser = questionsWithRandomOptions.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      options: q.options,
      point: q.point,
      difficultyLevels: q.difficultyLevels,
    }));

    this.logger.log(`Started exam for user ${userId}, test ID: ${userTest.id}`);

    return {
      success: true,
      message: "Exam started successfully",
      data: {
        userTestId: userTest.id,
        questions: questionsForUser,
      },
    };
  }

  async submitExam(userId: string, dto: SubmitExamDto) {
    // Validate user test exists and belongs to user
    const userTest = await this.userTestRepo.get(dto.userTestId);
    if (!userTest) {
      throw new NotFoundException("Test not found");
    }

    if (userTest.userId !== userId) {
      throw new BadRequestException("Test does not belong to this user");
    }

    if (userTest.totalScore !== null) {
      throw new BadRequestException("Test already submitted");
    }

    // Get all questions from the test
    const questionIds = dto.answers.map((a) => a.questionId);
    const questions = await Promise.all(
      questionIds.map((id) => this.questionRepo.get(id)),
    );

    const validQuestions = questions.filter((q) => q !== null) as Question[];

    if (validQuestions.length !== dto.answers.length) {
      throw new BadRequestException("Some questions not found");
    }

    // Calculate score and evaluate per-skill levels
    const examResult = this.scoringService.scoreAndEvaluate(
      validQuestions,
      dto.answers,
    );

    // Save user answers and update test result in transaction
    await this.userTestRepo.executeWithTransaction(async (tx) => {
      // Save all answers
      const answersToSave = examResult.answersDetails.map((detail) => ({
        userTestId: dto.userTestId,
        questionId: detail.questionId,
        chosenAnswer:
          dto.answers.find((a) => a.questionId === detail.questionId)
            ?.chosenAnswer || "",
        isCorrect: detail.isCorrect,
        pointGained: detail.pointGained,
      }));

      await this.userAnswerRepo.createMany(answersToSave, tx);

      // Update test result with skill-based levels
      await this.userTestRepo.updateTestResult(
        dto.userTestId,
        examResult.totalScore,
        examResult.skillLevelsAssessed,
        tx,
      );
    });

    // Since it's single skill, extract the single level
    const skillId = validQuestions[0].skillId;
    const levelAssessed = examResult.skillLevelsAssessed[skillId] || "Beginner";

    this.logger.log(
      `Submitted exam for user ${userId}, score: ${examResult.totalScore}, skill: ${skillId}, level: ${levelAssessed}`,
    );

    return {
      success: true,
      message: "Exam submitted successfully",
      data: {
        totalScore: examResult.totalScore,
        correctAnswers: examResult.correctAnswers,
        incorrectAnswers: examResult.incorrectAnswers,
        skillId,
        levelAssessed,
        skillLevelsAssessed: examResult.skillLevelsAssessed,
      },
    };
  }

  async getUserTests(userId: string) {
    const tests = await this.userTestRepo.getUserTests(userId);
    return {
      success: true,
      message: "User tests fetched successfully",
      data: tests,
    };
  }

  async getTestDetails(userId: string, testId: string) {
    const test = await this.userTestRepo.get(testId);
    if (!test) {
      throw new NotFoundException("Test not found");
    }

    if (test.userId !== userId) {
      throw new BadRequestException("Test does not belong to this user");
    }

    const answers = await this.userAnswerRepo.getTestAnswers(testId);

    return {
      success: true,
      message: "Test details fetched successfully",
      data: {
        test,
        answers,
      },
    };
  }
}
