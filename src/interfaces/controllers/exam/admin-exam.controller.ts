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
} from "@/use-cases/exam/dto";
import { FileInterceptor } from "@nestjs/platform-express";
import { SystemAuthorizeGuard } from "@/frameworks/auth-services/guards/system-authorize.guard";

@ApiTags("Admin - Exam System")
@ApiBearerAuth()
@Controller("admin/exam")
@UseGuards(JwtAuthGuard)
@UseGuards(JwtAuthGuard, SystemAuthorizeGuard)
export class AdminExamController {
  constructor(private readonly examUseCases: ExamUseCases) {}

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
