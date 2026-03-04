import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
} from "@nestjs/common";
import { ApiOperation, ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards/jwt-auth.guard";
import { ExamUseCases } from "@/use-cases/exam/exam.use-case";
import {
  StartExamDto,
  SubmitExamDto,
  SavePartialAnswersDto,
} from "@/interfaces/dtos/exam";
import { GetUser } from "@/common/decorators";
import type { TokenPayload } from "@/common/types";
import { GetSkillsQueryDto } from "@/interfaces/dtos/skills";

@ApiTags("Exam")
@Controller("exam")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExamController {
  constructor(private readonly examUseCases: ExamUseCases) {}

  @ApiOperation({
    summary: "Start an exam",
    description:
      "Select 1 skill and optionally difficulty levels. System will generate 20 randomized questions for that skill.",
  })
  @Post("start")
  @ApiBearerAuth()
  async startExam(@GetUser() user: TokenPayload, @Body() dto: StartExamDto) {
    return this.examUseCases.startExam(user.userId, dto);
  }

  @ApiOperation({
    summary: "Submit exam answers",
    description:
      "Submit answers for all questions. System will calculate score and assign skill level.",
  })
  @Post("submit")
  @ApiBearerAuth()
  async submitExam(@GetUser() user: TokenPayload, @Body() dto: SubmitExamDto) {
    return this.examUseCases.submitExam(user.userId, dto);
  }

  @ApiOperation({
    summary: "Get user's exam history",
    description: "Get all tests taken by the authenticated user.",
  })
  @Get("my-tests")
  @ApiBearerAuth()
  async getMyTests(@GetUser() user: TokenPayload) {
    return this.examUseCases.getUserTests(user.userId);
  }

  @ApiOperation({
    summary: "Get test details",
    description:
      "Get detailed results of a specific test including all answers and skill-level assessments.",
  })
  @Get("my-tests/:testId")
  @ApiBearerAuth()
  async getTestDetails(
    @GetUser() user: TokenPayload,
    @Param("testId") testId: string,
  ) {
    return this.examUseCases.getTestDetails(user.userId, testId);
  }

  @ApiOperation({
    summary: "Get skills with questions",
    description:
      "Get all skills that have at least 1 question. Supports search by skill name and pagination.",
  })
  @Get("skills")
  @ApiBearerAuth()
  async getSkillsWithQuestions(@Query() query: GetSkillsQueryDto) {
    return this.examUseCases.getSkillsWithQuestions(query);
  }

  @ApiOperation({
    summary: "Get incomplete exams",
    description:
      "Get all incomplete exams (tests that haven't been submitted yet) for the authenticated user.",
  })
  @Get("incomplete")
  @ApiBearerAuth()
  async getIncompleteExams(@GetUser() user: TokenPayload) {
    return this.examUseCases.getIncompleteExams(user.userId);
  }

  @ApiOperation({
    summary: "Get incomplete exam questions",
    description:
      "Get questions for an incomplete exam with saved answers (if any). Use this to continue an exam.",
  })
  @Get("incomplete/:testId")
  @ApiBearerAuth()
  async getIncompleteExamQuestions(
    @GetUser() user: TokenPayload,
    @Param("testId") testId: string,
  ) {
    return this.examUseCases.getIncompleteExamQuestions(user.userId, testId);
  }

  @ApiOperation({
    summary: "Save partial answers",
    description:
      "Save or update answers for an incomplete exam. You can call this multiple times to save progress.",
  })
  @Post("save-answers")
  @ApiBearerAuth()
  async savePartialAnswers(
    @GetUser() user: TokenPayload,
    @Body() dto: SavePartialAnswersDto,
  ) {
    return this.examUseCases.savePartialAnswers(
      user.userId,
      dto.userTestId,
      dto.answers,
    );
  }
}
