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
  CreateAreaDto,
  UpdateAreaDto,
  CreateQuestionDto,
  UpdateQuestionDto,
  ToggleQuestionStatusDto,
  QueryQuestionsDto,
  CreateLevelDto,
  UpdateLevelDto,
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

  // ==================== AREA MANAGEMENT ====================

  @ApiOperation({ summary: "Create a new area" })
  @Post("areas")
  async createArea(@Body() dto: CreateAreaDto) {
    return this.examUseCases.createArea(dto);
  }

  @ApiOperation({ summary: "Update an area" })
  @Put("areas/:id")
  async updateArea(@Param("id") id: string, @Body() dto: UpdateAreaDto) {
    return this.examUseCases.updateArea(id, dto);
  }

  @ApiOperation({ summary: "Delete an area" })
  @Delete("areas/:id")
  async deleteArea(@Param("id") id: string) {
    return this.examUseCases.deleteArea(id);
  }

  @ApiOperation({ summary: "Get all areas with pagination" })
  @Get("areas")
  async getAreas(
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("keyword") keyword?: string,
  ) {
    return this.examUseCases.getAreas({ page, limit, keyword });
  }

  @ApiOperation({ summary: "Get area by ID" })
  @Get("areas/:id")
  async getAreaById(@Param("id") id: string) {
    return this.examUseCases.getAreaById(id);
  }

  // ==================== QUESTION MANAGEMENT ====================

  @ApiOperation({ summary: "Create a new question" })
  @Post("questions")
  async createQuestion(@Body() dto: CreateQuestionDto) {
    return this.examUseCases.createQuestion(dto);
  }

  @ApiOperation({ summary: "Update a question" })
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

  @ApiOperation({ summary: "Get all questions with filters and pagination" })
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

  @ApiOperation({ summary: "Import questions from CSV file" })
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

  @ApiOperation({ summary: "Import questions from JSON" })
  @Post("questions/import/json")
  async importQuestionsJSON(@Body() body: { data: any[]; fileName: string }) {
    return this.examUseCases.importQuestionsJSON(body.data, body.fileName);
  }

  @ApiOperation({ summary: "Get import logs" })
  @Get("questions/import/logs")
  async getImportLogs(@Query("limit") limit?: number) {
    return this.examUseCases.getImportLogs(limit || 10);
  }

  // ==================== LEVEL MANAGEMENT ====================

  @ApiOperation({ summary: "Create a new level" })
  @Post("levels")
  async createLevel(@Body() dto: CreateLevelDto) {
    return this.examUseCases.createLevel(dto);
  }

  @ApiOperation({ summary: "Update a level" })
  @Put("levels/:id")
  async updateLevel(@Param("id") id: string, @Body() dto: UpdateLevelDto) {
    return this.examUseCases.updateLevel(id, dto);
  }

  @ApiOperation({ summary: "Delete a level" })
  @Delete("levels/:id")
  async deleteLevel(@Param("id") id: string) {
    return this.examUseCases.deleteLevel(id);
  }

  @ApiOperation({ summary: "Get all levels for an area" })
  @Get("levels/area/:areaId")
  async getLevelsByArea(@Param("areaId") areaId: string) {
    return this.examUseCases.getLevelsByArea(areaId);
  }
}
