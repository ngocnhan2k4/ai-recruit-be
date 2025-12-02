import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiOperation, ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards/jwt-auth.guard";
import { ExamUseCases } from "@/use-cases/exam/exam.use-case";
import { StartExamDto, SubmitExamDto } from "@/use-cases/exam/dto";

@ApiTags("Exam")
@Controller("exam")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExamController {
  constructor(private readonly examUseCases: ExamUseCases) {}

  @ApiOperation({
    summary: "Start an exam",
    description:
      "Select an area and up to 5 skills. System will generate 20 randomized questions.",
  })
  @Post("start")
  @ApiBearerAuth()
  async startExam(@Request() req: any, @Body() dto: StartExamDto) {
    const userId = req.user.id;
    return this.examUseCases.startExam(userId, dto);
  }

  @ApiOperation({
    summary: "Submit exam answers",
    description:
      "Submit answers for all questions. System will calculate score and assign level.",
  })
  @Post("submit")
  @ApiBearerAuth()
  async submitExam(@Request() req: any, @Body() dto: SubmitExamDto) {
    const userId = req.user.id;
    return this.examUseCases.submitExam(userId, dto);
  }

  @ApiOperation({
    summary: "Get user's exam history",
    description: "Get all tests taken by the authenticated user.",
  })
  @Get("my-tests")
  @ApiBearerAuth()
  async getMyTests(@Request() req: any) {
    const userId = req.user.id;
    return this.examUseCases.getUserTests(userId);
  }

  @ApiOperation({
    summary: "Get test details",
    description:
      "Get detailed results of a specific test including all answers.",
  })
  @Get("my-tests/:testId")
  @ApiBearerAuth()
  async getTestDetails(@Request() req: any, @Param("testId") testId: string) {
    const userId = req.user.id;
    return this.examUseCases.getTestDetails(userId, testId);
  }

  @ApiOperation({
    summary: "Get all areas",
    description: "Get list of all available areas for selection.",
  })
  @Get("areas")
  @ApiBearerAuth()
  async getAreas() {
    return this.examUseCases.getAreas({});
  }

  @ApiOperation({
    summary: "Get area by ID",
    description: "Get details of a specific area.",
  })
  @Get("areas/:id")
  @ApiBearerAuth()
  async getAreaById(@Param("id") id: string) {
    return this.examUseCases.getAreaById(id);
  }
}
