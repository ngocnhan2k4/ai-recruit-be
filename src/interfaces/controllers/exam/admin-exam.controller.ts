import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Headers,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiTags,
  ApiConsumes,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards/jwt-auth.guard";
import { ExamUseCases } from "@/use-cases/exam/exam.use-case";
import {
  CreateQuestionDto,
  UpdateQuestionDto,
  UpdateQuestionTranslationDto,
  ToggleQuestionStatusDto,
  QueryQuestionsDto,
  QuerySkillQuestionsDto,
  QueryAvailableQuestionsDto,
  AddQuestionsToSkillDto,
} from "@/interfaces/dtos/exam";
import { FileInterceptor } from "@nestjs/platform-express";
import { SystemAuthorizeGuard } from "@/frameworks/auth-services/guards/system-authorize.guard";

@ApiTags("Admin - Exam System")
@ApiBearerAuth()
@Controller("admin/exam")
@UseGuards(JwtAuthGuard, SystemAuthorizeGuard)
export class AdminExamController {
  constructor(private readonly examUseCases: ExamUseCases) {}

  @ApiOperation({
    summary: "List questions available to add to this skill",
    description:
      "Questions that belong to other skills. Use this list to pick questions and add them to the current skill via POST skills/:skillId/questions.",
  })
  @Get("skills/:skillId/questions/available")
  async getAvailableQuestionsForSkill(
    @Param("skillId") skillId: string,
    @Query() query: QueryAvailableQuestionsDto,
    @Headers("accept-language") acceptLanguage?: string,
  ) {
    return this.examUseCases.getQuestions(
      {
        ...query,
        excludeSkillId: skillId,
      },
      acceptLanguage,
    );
  }

  @ApiOperation({
    summary: "List questions in a skill",
    description: "Get paginated questions that belong to the given skill.",
  })
  @Get("skills/:skillId/questions")
  async getSkillQuestions(
    @Param("skillId") skillId: string,
    @Query() query: QuerySkillQuestionsDto,
    @Headers("accept-language") acceptLanguage?: string,
  ) {
    return this.examUseCases.getQuestions(
      { ...query, skillId },
      acceptLanguage,
    );
  }

  @ApiOperation({
    summary: "Add questions to skill",
    description:
      "Assign selected questions to this skill (moves questions from their current skill to this one).",
  })
  @Post("skills/:skillId/questions")
  async addQuestionsToSkill(
    @Param("skillId") skillId: string,
    @Body() dto: AddQuestionsToSkillDto,
  ) {
    return this.examUseCases.assignQuestionsToSkill(skillId, dto);
  }

  // ==================== QUESTION MANAGEMENT ====================

  @ApiOperation({
    summary: "Create a new question",
    description:
      "Create a question with skillId and 1-3 difficulty levels. No area required.",
  })
  @Post("questions")
  async createQuestion(
    @Body() dto: CreateQuestionDto,
    @Headers("accept-language") acceptLanguage?: string,
  ) {
    return this.examUseCases.createQuestion(dto, acceptLanguage);
  }

  @ApiOperation({
    summary: "Update a question",
    description: "Update question details including difficulty levels array.",
  })
  @Put("questions/:id")
  async updateQuestion(
    @Param("id") id: string,
    @Body() dto: UpdateQuestionDto,
    @Headers("accept-language") acceptLanguage?: string,
  ) {
    return this.examUseCases.updateQuestion(id, dto, acceptLanguage);
  }

  @ApiOperation({ summary: "Delete a question" })
  @Delete("questions/:id")
  async deleteQuestion(@Param("id") id: string) {
    return this.examUseCases.deleteQuestion(id);
  }

  @ApiOperation({ summary: "Toggle question active status" })
  @Put("questions/:id/status")
  async toggleQuestionStatus(
    @Param("id") id: string,
    @Body() dto: ToggleQuestionStatusDto,
  ) {
    return this.examUseCases.toggleQuestionStatus(id, dto);
  }

  @ApiOperation({
    summary: "Get all questions with filters and pagination",
    description:
      "Filter by skillId, difficultyLevels, and active status. No area filter.",
  })
  @Get("questions")
  async getQuestions(
    @Query() query: QueryQuestionsDto,
    @Headers("accept-language") acceptLanguage?: string,
  ) {
    return this.examUseCases.getQuestions(query, acceptLanguage);
  }

  @ApiOperation({ summary: "Get question by ID" })
  @Get("questions/:id")
  async getQuestionById(
    @Param("id") id: string,
    @Headers("accept-language") acceptLanguage?: string,
  ) {
    return this.examUseCases.getQuestionById(id, acceptLanguage);
  }

  @ApiOperation({
    summary: "Get question translation by language",
    description:
      "Fetch only the editable translated text for a question without changing canonical answer-key mapping.",
  })
  @Get("questions/:id/translations/:languageCode")
  async getQuestionTranslation(
    @Param("id") id: string,
    @Param("languageCode") languageCode: string,
  ) {
    return this.examUseCases.getQuestionTranslation(id, languageCode);
  }

  @ApiOperation({
    summary: "Update question translation by language",
    description:
      "Manually edit translated question text and translated options only. Correct answer mapping stays locked to the base question key.",
  })
  @Put("questions/:id/translations/:languageCode")
  async updateQuestionTranslation(
    @Param("id") id: string,
    @Param("languageCode") languageCode: string,
    @Body() dto: UpdateQuestionTranslationDto,
  ) {
    return this.examUseCases.updateQuestionTranslation(id, languageCode, dto);
  }

  // ==================== QUESTION IMPORT ====================

  @ApiOperation({
    summary: "Import questions from CSV file",
    description:
      "Import questions with skillId and difficultyLevels array. No area required.",
  })
  @ApiConsumes("multipart/form-data")
  @Post("questions/import/csv")
  @UseInterceptors(FileInterceptor("file"))
  async importQuestionsCSV(
    @UploadedFile() file: Express.Multer.File,
    @Headers("accept-language") acceptLanguage?: string,
  ) {
    if (!file) {
      throw new BadRequestException("File is required");
    }

    const fileContent = file.buffer.toString("utf-8");
    return this.examUseCases.importQuestionsCSV(fileContent, acceptLanguage);
  }

  @ApiOperation({
    summary: "Import questions from JSON",
    description:
      "Import questions with skillId and difficultyLevels array. No area required.",
  })
  @Post("questions/import/json")
  async importQuestionsJSON(
    @Body() body: { data: any[]; fileName: string },
    @Headers("accept-language") acceptLanguage?: string,
  ) {
    return this.examUseCases.importQuestionsJSON(body.data, acceptLanguage);
  }
}
