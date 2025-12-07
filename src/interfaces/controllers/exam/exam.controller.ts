import { Controller, Get, Post, Body, Param, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards/jwt-auth.guard";
import { ExamUseCases } from "@/use-cases/exam/exam.use-case";
import { StartExamDto, SubmitExamDto } from "@/interfaces/dtos/exam";
import { GetUser } from "@/common/decorators/get-user.decorator";
import type { TokenPayload } from "@/common/types/token";

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
}
