import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import {
  IAreaRepository,
  IQuestionRepository,
  IUserTestRepository,
  IUserAnswerRepository,
  ISkillRepository,
  IUserSkillRepository,
  Question,
} from "@/core";
import {
  CreateAreaDto,
  UpdateAreaDto,
  CreateQuestionDto,
  UpdateQuestionDto,
  ToggleQuestionStatusDto,
  QueryQuestionsDto,
  AddQuestionsToSkillDto,
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
import {
  EXAM_MAX_QUESTIONS,
  EXAM_USER_SKILL_MIN_SCORE,
  USER_SKILL_SOURCE_EXAM,
  TranslationJobType,
  TRANSLATION_SUPPORTED_LANGUAGES,
  SUPPORTED_LANGUAGE_CODES,
} from "@/common/constants";
import {
  getExplicitRequestLanguage,
  getRequestLanguage,
  inferSupportedLanguageFromText,
  normalizeLanguageCode,
} from "@/common/utils";
import { IMessageQueueService } from "@/core/abstracts/message-queue.abstract";
import { UpdateQuestionTranslationDto } from "@/interfaces/dtos/exam";

@Injectable()
export class ExamUseCases {
  private readonly logger = new Logger(ExamUseCases.name);

  constructor(
    private readonly areaRepo: IAreaRepository,
    private readonly questionRepo: IQuestionRepository,
    private readonly userTestRepo: IUserTestRepository,
    private readonly userAnswerRepo: IUserAnswerRepository,
    private readonly skillRepo: ISkillRepository,
    private readonly userSkillRepo: IUserSkillRepository,
    private readonly importService: QuestionImportService,
    private readonly randomizerService: QuestionRandomizerService,
    private readonly scoringService: ExamScoringService,
    private readonly messageQueueService: IMessageQueueService,
  ) {}

  private resolveTranslationTargets(sourceLanguage: string) {
    const normalizedSourceLanguage = normalizeLanguageCode(sourceLanguage);
    return TRANSLATION_SUPPORTED_LANGUAGES.filter(
      (language) => language !== normalizedSourceLanguage,
    );
  }

  private async enqueueQuestionTranslation(
    questionId: string,
    sourceLanguage: string,
  ) {
    const normalizedSourceLanguage = normalizeLanguageCode(sourceLanguage);
    const targetLanguages = this.resolveTranslationTargets(
      normalizedSourceLanguage,
    );
    if (!targetLanguages.length) {
      return;
    }

    await this.messageQueueService.addTranslation(TranslationJobType.QUESTION, {
      questionId,
      sourceLanguage: normalizedSourceLanguage,
      targetLanguages,
    });
  }

  private resolveQuestionSourceLanguage(questionText: string) {
    return normalizeLanguageCode(
      getExplicitRequestLanguage() ??
        inferSupportedLanguageFromText(questionText),
    );
  }

  private addAnswerKeys(question: Question): Question {
    const optionKeys =
      question.optionKeys?.length === question.options.length
        ? question.optionKeys
        : question.options.map((_, index) => String(index));
    const derivedCorrectAnswerIndex = question.options.findIndex(
      (option) =>
        option.trim().toLowerCase() ===
        question.correctAnswer.trim().toLowerCase(),
    );

    return {
      ...question,
      optionKeys,
      correctAnswerKey:
        question.correctAnswerKey ||
        (derivedCorrectAnswerIndex >= 0
          ? String(derivedCorrectAnswerIndex)
          : "0"),
    };
  }

  private resolveChosenAnswerKey(answer: {
    chosenAnswerKey?: string;
    chosenAnswer?: string;
  }) {
    return answer.chosenAnswerKey?.trim() || answer.chosenAnswer?.trim() || "";
  }

  private normalizeSupportedLanguageCode(languageCode: string) {
    const normalized = languageCode.trim().toLowerCase().split("-")[0];

    if (!SUPPORTED_LANGUAGE_CODES.includes(normalized as "vi" | "en")) {
      throw new BadRequestException(
        `Unsupported language code: ${languageCode}`,
      );
    }

    return normalized;
  }

  private buildQuestionCreatePayload(
    dto: CreateQuestionDto,
  ): Partial<Question> {
    const options = dto.options ?? [];
    const correctAnswerIndex = options.findIndex(
      (option) =>
        option.trim().toLowerCase() === dto.correctAnswer.trim().toLowerCase(),
    );

    if (correctAnswerIndex < 0) {
      throw new BadRequestException(
        "Correct answer must match one of the provided options",
      );
    }

    return {
      ...dto,
      options,
      optionKeys: options.map((_, index) => String(index)),
      correctAnswer: dto.correctAnswer,
      correctAnswerKey: String(correctAnswerIndex),
      difficultyLevels: dto.difficultyLevels as Question["difficultyLevels"],
    } as Partial<Question>;
  }

  private buildQuestionUpdatePayload(
    existing: Question,
    dto: UpdateQuestionDto,
  ): Partial<Question> {
    const payload = { ...dto } as Partial<Question>;

    const nextOptions = dto.options ?? existing.options;
    const nextCorrectAnswer = dto.correctAnswer ?? existing.correctAnswer;

    if (dto.options || dto.correctAnswer) {
      const correctAnswerIndex = nextOptions.findIndex(
        (option) =>
          option.trim().toLowerCase() ===
          nextCorrectAnswer.trim().toLowerCase(),
      );

      if (correctAnswerIndex < 0) {
        throw new BadRequestException(
          "Correct answer must match one of the provided options",
        );
      }

      payload.options = nextOptions;
      payload.optionKeys = nextOptions.map((_, index) => String(index));
      payload.correctAnswer = nextCorrectAnswer;
      payload.correctAnswerKey = String(correctAnswerIndex);
    }

    return payload;
  }

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
    const sourceLanguage = this.resolveQuestionSourceLanguage(dto.questionText);
    const isDuplicate = await this.questionRepo.checkDuplicate(
      dto.skillId,
      dto.questionText,
    );
    if (isDuplicate) {
      throw new BadRequestException(
        "Question already exists for this skill (case-insensitive)",
      );
    }
    const question = await this.questionRepo.create(
      this.buildQuestionCreatePayload(dto),
    );
    await this.enqueueQuestionTranslation(question.id, sourceLanguage);
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
    const sourceLanguage = this.resolveQuestionSourceLanguage(
      dto.questionText ?? existing.questionText,
    );

    const [updated] = await this.questionRepo.update(
      { id },
      this.buildQuestionUpdatePayload(existing, dto),
    );
    if (updated) {
      await this.enqueueQuestionTranslation(updated.id, sourceLanguage);
    }
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
    const rawKeyword = query.keyword ?? "";
    const keyword =
      typeof rawKeyword === "string" &&
      (rawKeyword === "undefined" || rawKeyword === "null")
        ? ""
        : rawKeyword;

    const result = await this.questionRepo.getPaginatedQuestions({
      ...query,
      keyword,
      limit: query.limit ?? 20,
    });
    return {
      success: true,
      message: "Questions fetched successfully",
      data: result,
    };
  }

  /** Assign selected questions to a skill (move questions to this skill). */
  async assignQuestionsToSkill(skillId: string, dto: AddQuestionsToSkillDto) {
    const skill = await this.skillRepo.get(skillId);
    if (!skill) {
      throw new NotFoundException("Skill not found");
    }

    for (const questionId of dto.questionIds) {
      const question = await this.questionRepo.get(questionId);
      if (!question) {
        throw new NotFoundException(`Question not found: ${questionId}`);
      }
    }

    const updated: Question[] = await this.questionRepo.executeWithTransaction(
      async (tx) => {
        const result: Question[] = [];
        for (const questionId of dto.questionIds) {
          const [q] = await this.questionRepo.update(
            { id: questionId },
            { skillId } as Partial<Question>,
            tx,
          );
          if (q) result.push(q);
        }
        return result;
      },
    );

    this.logger.log(
      `Assigned ${updated.length} question(s) to skill ${skillId} (${skill.name})`,
    );
    return {
      success: true,
      message: `Assigned ${updated.length} question(s) to skill successfully`,
      data: { skill, assignedCount: updated.length, questions: updated },
    };
  }

  async getQuestionById(id: string) {
    const question = await this.questionRepo.getQuestionByIdWithLanguage(id);
    if (!question) {
      throw new NotFoundException("Question not found");
    }

    return {
      success: true,
      message: "Question fetched successfully",
      data: question,
    };
  }

  async getQuestionTranslation(id: string, languageCode: string) {
    const normalizedLanguageCode =
      this.normalizeSupportedLanguageCode(languageCode);
    const existing = await this.questionRepo.get(id);
    if (!existing) {
      throw new NotFoundException("Question not found");
    }

    const question = this.addAnswerKeys(existing);
    const translation = await this.questionRepo.getQuestionTranslation(
      id,
      normalizedLanguageCode,
    );

    return {
      success: true,
      message: "Question translation fetched successfully",
      data: {
        questionId: question.id,
        languageCode: normalizedLanguageCode,
        questionText: translation?.questionText ?? question.questionText,
        options: translation?.options ?? question.options,
        optionKeys: question.optionKeys,
        correctAnswerKey: question.correctAnswerKey,
        exists: Boolean(translation),
      },
    };
  }

  async updateQuestionTranslation(
    id: string,
    languageCode: string,
    dto: UpdateQuestionTranslationDto,
  ) {
    const normalizedLanguageCode =
      this.normalizeSupportedLanguageCode(languageCode);
    const existing = await this.questionRepo.get(id);
    if (!existing) {
      throw new NotFoundException("Question not found");
    }

    const question = this.addAnswerKeys(existing);
    const trimmedQuestionText = dto.questionText.trim();
    const normalizedOptions = dto.options.map((option) => option.trim());

    if (!trimmedQuestionText) {
      throw new BadRequestException("Question translation text is required");
    }

    if (normalizedOptions.length !== question.options.length) {
      throw new BadRequestException(
        `Translated options must contain exactly ${question.options.length} items`,
      );
    }

    if (normalizedOptions.some((option) => !option)) {
      throw new BadRequestException(
        "Translated options must not contain empty values",
      );
    }

    const correctAnswerIndex = question.optionKeys.findIndex(
      (key) => key === question.correctAnswerKey,
    );
    if (
      correctAnswerIndex < 0 ||
      correctAnswerIndex >= normalizedOptions.length
    ) {
      throw new BadRequestException(
        "Unable to determine the correct answer mapping for this question",
      );
    }

    await this.questionRepo.upsertQuestionTranslation(
      id,
      normalizedLanguageCode,
      {
        questionText: trimmedQuestionText,
        options: normalizedOptions,
        correctAnswer: normalizedOptions[correctAnswerIndex],
      },
    );

    return this.getQuestionTranslation(id, normalizedLanguageCode);
  }

  // ==================== QUESTION IMPORT ====================

  async importQuestionsCSV(
    fileContent: string,
  ): Promise<{ success: boolean; message: string; data: ImportResultDto }> {
    const result = await this.importService.importFromCSV(fileContent);
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
  ): Promise<{ success: boolean; message: string; data: ImportResultDto }> {
    const result = await this.importService.importFromJSON(data);
    this.logger.log(
      `Imported ${result.successRows}/${result.totalRows} questions from JSON`,
    );
    return {
      success: true,
      message: "Questions imported successfully",
      data: result,
    };
  }

  /**
   * Re-enqueue translation jobs for existing questions so that questions which
   * were imported/created before translations existed (or whose translation job
   * failed) get their other-language translation generated. Without a
   * translation row for the requested language, the exam falls back to the
   * source language — which is why switching the UI language appears to do
   * nothing for those questions.
   *
   * The source language is inferred per-question from its text, and the
   * translation worker upserts, so this is safe to run repeatedly.
   */
  async backfillQuestionTranslations(options?: { onlyActive?: boolean }) {
    const limit = 200;
    let page = 1;
    let enqueued = 0;
    let scanned = 0;

    for (;;) {
      const result = await this.questionRepo.getPaginatedQuestions({
        limit,
        page,
        ...(options?.onlyActive ? { isActive: true } : {}),
      });

      const items = result.data ?? [];
      if (items.length === 0) {
        break;
      }

      for (const question of items) {
        scanned++;
        const sourceLanguage = inferSupportedLanguageFromText(
          question.questionText,
        );
        await this.enqueueQuestionTranslation(question.id, sourceLanguage);
        enqueued++;
      }

      if (items.length < limit) {
        break;
      }
      page++;
    }

    this.logger.log(
      `Backfill enqueued ${enqueued} question translation job(s) (scanned ${scanned})`,
    );

    return {
      success: true,
      message: "Question translation backfill enqueued",
      data: { scanned, enqueued },
    };
  }

  // ==================== LEVEL MANAGEMENT ====================

  // ==================== EXAM FLOW ====================

  async startExam(userId: string, dto: StartExamDto) {
    const languageCode = getRequestLanguage();
    // Fetch all active questions for single skill and optional difficulty levels
    const allQuestions = await this.questionRepo.getActiveQuestionsBySkills(
      [dto.skillId],
      dto.difficultyLevels,
    );
    const allQuestionsWithKeys = allQuestions.map((question) =>
      this.addAnswerKeys(question),
    );

    if (allQuestionsWithKeys.length === 0) {
      throw new BadRequestException(
        "No active questions found for selected skill and difficulty levels",
      );
    }

    if (allQuestionsWithKeys.length < EXAM_MAX_QUESTIONS) {
      throw new BadRequestException(
        `Not enough questions for this skill. Found ${allQuestionsWithKeys.length}, need ${EXAM_MAX_QUESTIONS}. Try selecting different difficulty levels or contact admin.`,
      );
    }

    // Randomize and select questions (use available count or EXAM_MAX_QUESTIONS, whichever is less)
    const questionCount = Math.min(
      allQuestionsWithKeys.length,
      EXAM_MAX_QUESTIONS,
    );
    const selectedQuestions = this.randomizerService.randomizeQuestions(
      allQuestionsWithKeys,
      {
        totalQuestions: questionCount,
        balanceBySkill: false,
      },
    );

    // Create user test record first so we can seed a STABLE option order by
    // its id. Question order is already randomized above (selectedQuestions).
    const questionIds = selectedQuestions.map((q) => q.id);
    const userTest = await this.userTestRepo.create({
      userId,
      selectedSkillIds: [dto.skillId],
      selectedDifficultyLevels: dto.difficultyLevels as any,
      questionIds: questionIds,
      totalScore: null, // Explicitly set to null for unsubmitted tests
    });

    // Deterministically randomize answer options, seeded by the test id, so the
    // order stays identical on every subsequent fetch (e.g. continuing the exam
    // or switching UI language) instead of reshuffling each time.
    const questionsWithRandomOptions =
      this.randomizerService.randomizeOptionsDeterministic(
        selectedQuestions,
        userTest.id,
      );

    // Return questions without correct answers
    const questionsForUser = questionsWithRandomOptions.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      options: q.options,
      optionKeys: q.optionKeys,
      difficultyLevels: q.difficultyLevels,
    }));

    this.logger.log(`Started exam for user ${userId}, test ID: ${userTest.id}`);

    return {
      success: true,
      message: "Exam started successfully",
      data: {
        userTestId: userTest.id,
        languageCode,
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

    // Check if test is already submitted (totalScore is not null/undefined and > 0)
    if (userTest.totalScore != null && userTest.totalScore >= 0) {
      throw new BadRequestException("Test already submitted");
    }

    // Validate that all questions from the exam are answered
    if (!userTest.questionIds || userTest.questionIds.length === 0) {
      throw new BadRequestException(
        "Test questions not found. Please restart the exam.",
      );
    }

    const submittedQuestionIds = new Set(dto.answers.map((a) => a.questionId));
    const missingQuestionIds = userTest.questionIds.filter(
      (id) => !submittedQuestionIds.has(id),
    );

    if (missingQuestionIds.length > 0) {
      throw new BadRequestException(
        `Please answer all questions before submitting. Missing answers for ${missingQuestionIds.length} question(s).`,
      );
    }

    // Validate all submitted answers have a non-empty stable answer key/text
    const emptyAnswers = dto.answers.filter(
      (a) => this.resolveChosenAnswerKey(a) === "",
    );
    if (emptyAnswers.length > 0) {
      throw new BadRequestException(
        `Please provide answers for all questions. ${emptyAnswers.length} question(s) have empty answers.`,
      );
    }

    // Get all questions from the test
    const validQuestions = (
      await this.questionRepo.getQuestionsByIdsWithLanguage(
        userTest.questionIds,
      )
    ).map((question) => this.addAnswerKeys(question));

    if (validQuestions.length !== userTest.questionIds.length) {
      throw new BadRequestException("Some questions not found");
    }

    // Calculate score and evaluate per-skill levels
    const examResult = this.scoringService.scoreAndEvaluate(
      validQuestions,
      dto.answers,
      userTest.selectedDifficultyLevels as string[] | null | undefined,
    );

    // Save user answers and update test result in transaction
    await this.userTestRepo.executeWithTransaction(async (tx) => {
      const answersToSave = examResult.answersDetails.map((detail) => ({
        questionId: detail.questionId,
        chosenAnswer: this.resolveChosenAnswerKey(
          dto.answers.find((a) => a.questionId === detail.questionId) || {},
        ),
        isCorrect: detail.isCorrect,
        pointGained: detail.pointGained,
      }));

      await this.userAnswerRepo.upsertScoredAnswers(
        dto.userTestId,
        answersToSave,
        tx,
      );

      // Update test result with skill-based levels
      await this.userTestRepo.updateTestResult(
        dto.userTestId,
        examResult.totalScore,
        examResult.skillLevelsAssessed,
        tx,
      );
    });

    // Upsert assessed skills into user_skills only when score meets threshold
    if (examResult.totalScore >= EXAM_USER_SKILL_MIN_SCORE) {
      const assessedSkillIds = Array.from(
        new Set([
          ...(userTest.selectedSkillIds ?? []),
          ...Object.keys(examResult.skillLevelsAssessed ?? {}),
        ]),
      ).filter(Boolean);

      if (assessedSkillIds.length > 0) {
        await this.userSkillRepo.createMany(
          assessedSkillIds.map((skillId) => ({
            userId,
            skillId,
            organizationId: null,
            source: USER_SKILL_SOURCE_EXAM,
          })),
        );
      }
    }

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

  async getUserTests(userId: string, skillId?: string) {
    const tests = await this.userTestRepo.getUserTests(userId);
    const filteredTests = skillId
      ? tests.filter((test) => (test.selectedSkillIds ?? []).includes(skillId))
      : tests;
    return {
      success: true,
      message: "User tests fetched successfully",
      data: filteredTests,
    };
  }

  async getTestDetails(userId: string, testId: string) {
    const test = await this.userTestRepo.getUserTestWithSkills(testId);
    if (!test) {
      throw new NotFoundException("Test not found");
    }

    if (test.userId !== userId) {
      throw new BadRequestException("Test does not belong to this user");
    }

    const answers = await this.userAnswerRepo.getTestAnswers(testId);
    const questions = (
      await this.questionRepo.getQuestionsByIdsWithLanguage(
        test.questionIds ?? [],
      )
    ).map((question) => this.addAnswerKeys(question));

    return {
      success: true,
      message: "Test details fetched successfully",
      data: {
        test,
        languageCode: getRequestLanguage(),
        questions,
        answers,
      },
    };
  }

  async getIncompleteExams(userId: string) {
    const allTests = await this.userTestRepo.getUserTests(userId);
    const incompleteTests = allTests.filter(
      (test) => test.totalScore == null || test.totalScore < 0,
    );

    return {
      success: true,
      message: "Incomplete exams fetched successfully",
      data: incompleteTests.map((test) => ({
        id: test.id,
        selectedSkills: test.selectedSkills ?? [],
        selectedSkillIds: test.selectedSkillIds,
        selectedDifficultyLevels: test.selectedDifficultyLevels,
        questionCount: test.questionIds?.length ?? 0,
        createdAt: test.createdAt,
      })),
    };
  }

  async getIncompleteExamQuestions(userId: string, testId: string) {
    const userTest = await this.userTestRepo.get(testId);
    if (!userTest) {
      throw new NotFoundException("Test not found");
    }

    if (userTest.userId !== userId) {
      throw new BadRequestException("Test does not belong to this user");
    }

    if (userTest.totalScore != null && userTest.totalScore >= 0) {
      throw new BadRequestException("Test already submitted");
    }

    if (!userTest.questionIds || userTest.questionIds.length === 0) {
      throw new BadRequestException("Test questions not found");
    }

    // Get all questions
    const validQuestions = (
      await this.questionRepo.getQuestionsByIdsWithLanguage(
        userTest.questionIds,
      )
    ).map((question) => this.addAnswerKeys(question));

    if (validQuestions.length !== userTest.questionIds.length) {
      throw new BadRequestException("Some questions not found");
    }

    // Get saved answers
    const savedAnswers = await this.userAnswerRepo.getTestAnswers(testId);
    const answerMap = new Map(
      savedAnswers.map((a) => [a.questionId, a.chosenAnswer]),
    );

    // Deterministically order answer options, seeded by the test id, so the
    // order matches what was shown when the exam started and stays stable across
    // refetches (including UI language switches) instead of reshuffling.
    const questionsWithRandomOptions =
      this.randomizerService.randomizeOptionsDeterministic(
        validQuestions,
        testId,
      );

    // Return questions with saved answers (if any)
    const questionsForUser = questionsWithRandomOptions.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      options: q.options,
      optionKeys: q.optionKeys,
      difficultyLevels: q.difficultyLevels,
      savedAnswer: answerMap.get(q.id) || null,
    }));

    return {
      success: true,
      message: "Incomplete exam questions fetched successfully",
      data: {
        userTestId: testId,
        languageCode: getRequestLanguage(),
        questions: questionsForUser,
        answeredCount: savedAnswers.length,
        totalCount: questionsForUser.length,
      },
    };
  }

  async savePartialAnswers(
    userId: string,
    testId: string,
    answers: Array<{
      questionId: string;
      chosenAnswer?: string;
      chosenAnswerKey?: string;
    }>,
  ) {
    const userTest = await this.userTestRepo.get(testId);
    if (!userTest) {
      throw new NotFoundException("Test not found");
    }

    if (userTest.userId !== userId) {
      throw new BadRequestException("Test does not belong to this user");
    }

    if (userTest.totalScore != null && userTest.totalScore >= 0) {
      throw new BadRequestException("Test already submitted");
    }

    if (!userTest.questionIds || userTest.questionIds.length === 0) {
      throw new BadRequestException("Test questions not found");
    }

    // Validate that all provided answers belong to this test
    const testQuestionIds = new Set(userTest.questionIds);
    const invalidAnswers = answers.filter(
      (a) => !testQuestionIds.has(a.questionId),
    );

    if (invalidAnswers.length > 0) {
      throw new BadRequestException("Some answers do not belong to this test");
    }

    // Filter out empty answers (user might want to clear previous answer by not sending it)
    const validAnswers = answers.filter(
      (a) => this.resolveChosenAnswerKey(a) !== "",
    );

    if (validAnswers.length === 0) {
      throw new BadRequestException("At least one valid answer is required");
    }

    // Upsert answers (save or update) - only save non-empty answers
    await this.userAnswerRepo.upsertAnswers(
      testId,
      validAnswers.map((item) => ({
        questionId: item.questionId,
        chosenAnswer: this.resolveChosenAnswerKey(item),
      })),
    );

    // Get updated answer count
    const savedAnswers = await this.userAnswerRepo.getTestAnswers(testId);

    this.logger.log(
      `Saved partial answers for user ${userId}, test ${testId}: ${savedAnswers.length}/${userTest.questionIds.length} answered`,
    );

    return {
      success: true,
      message: "Partial answers saved successfully",
      data: {
        savedCount: savedAnswers.length,
        totalCount: userTest.questionIds.length,
      },
    };
  }
}
