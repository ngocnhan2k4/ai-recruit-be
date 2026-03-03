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
  ToggleQuestionStatusDto,
  QueryQuestionsDto,
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

  // ==================== SKILL-CENTRIC MANAGEMENT ====================

  @ApiOperation({
    summary: "List skills with question count",
    description:
      "Get all skills with question count for admin. Use this to manage exam by skills.",
  })
  @Get("skills")
  async getSkillsWithQuestionCount(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("keyword") keyword?: string,
    @Query("sortBy") sortBy?: string,
    @Query("sortDirection") sortDirection?: "asc" | "desc",
  ) {
    return this.examUseCases.getSkillsWithQuestionCount({
      page,
      limit,
      keyword,
      sortBy,
      sortDirection,
    });
  }

  @ApiOperation({
    summary: "List questions available to add to this skill",
    description:
      "Questions that belong to other skills. Use this list to pick questions and add them to the current skill via POST skills/:skillId/questions.",
  })
  @Get("skills/:skillId/questions/available")
  async getAvailableQuestionsForSkill(
    @Param("skillId") skillId: string,
    @Query() query: Omit<QueryQuestionsDto, "skillId" | "excludeSkillId">,
  ) {
    return this.examUseCases.getQuestions({
      ...query,
      excludeSkillId: skillId,
    });
  }

  @ApiOperation({
    summary: "List questions in a skill",
    description: "Get paginated questions that belong to the given skill.",
  })
  @Get("skills/:skillId/questions")
  async getSkillQuestions(
    @Param("skillId") skillId: string,
    @Query() query: Omit<QueryQuestionsDto, "skillId">,
  ) {
    return this.examUseCases.getQuestions({ ...query, skillId });
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
  async createQuestion(@Body() dto: CreateQuestionDto) {
    return this.examUseCases.createQuestion(dto);
  }

  @ApiOperation({
    summary: "Update a question",
    description: "Update question details including difficulty levels array.",
  })
  @Put("questions/:id")
  async updateQuestion(
    @Param("id") id: string,
    @Body() dto: UpdateQuestionDto,
  ) {
    return this.examUseCases.updateQuestion(id, dto);
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
  async getQuestions(@Query() query: QueryQuestionsDto) {
    return this.examUseCases.getQuestions(query);
  }

  @ApiOperation({ summary: "Get question by ID" })
  @Get("questions/:id")
  async getQuestionById(@Param("id") id: string) {
    return this.examUseCases.getQuestionById(id);
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
  async importQuestionsCSV(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("File is required");
    }

    const fileContent = file.buffer.toString("utf-8");
    return this.examUseCases.importQuestionsCSV(fileContent, file.originalname);
  }

  @ApiOperation({
    summary: "Import questions from JSON",
    description:
      "Import questions with skillId and difficultyLevels array. No area required.",
  })
  @Post("questions/import/json")
  async importQuestionsJSON(@Body() body: { data: any[]; fileName: string }) {
    return this.examUseCases.importQuestionsJSON(body.data, body.fileName);
  }

  @ApiOperation({ summary: "Get import logs" })
  @Get("questions/import/logs")
  async getImportLogs(@Query("limit") limit?: number) {
    return this.examUseCases.getImportLogs(limit || 10);
  }
}
