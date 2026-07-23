import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants";
import { FileTextExtractor, userCvDataToText } from "@/common/utils";
import {
  CvLanguageEnum,
  CvTemplateEnum,
  IAIService,
  IMessageQueueService,
  INotificationRepository,
  ITaskRepository,
  IUserRepository,
  NewAiCv,
  OptimizeAtsRequest,
  FeatureCodeEnum,
  NotificationType,
  TaskTypeEnum,
  TaskStatusEnum,
  IFeatureService,
  OptimizedCvData,
} from "@/core";
import { IAiCvRepository } from "@/core/abstracts/repositories/ai-cv-repository.abstract";
import {
  ApiResponse,
  CvFieldSuggestionRequestDto,
  CvFieldSuggestionResponseDto,
  OptimizeAtsUploadDto,
  AiCvDto,
  AiCvListResponseDto,
  OptimizedCvDataDto,
  UpdateAiCvDto,
  UpdateAiCvV2Dto,
} from "@/interfaces/dtos";
import { GenerateCvPdfRequestDto } from "@/interfaces/dtos/ai-cv";
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { JitterBackoff, retry } from "@/common/utils";
import { INotificationService } from "@/core/abstracts/notification.abstract";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

@Injectable()
export class AiCvUseCases {
  private readonly logger = new Logger(AiCvUseCases.name);
  constructor(
    private readonly aiCvRepository: IAiCvRepository,
    private readonly aiService: IAIService,
    private readonly userRepository: IUserRepository,
    private readonly featureService: IFeatureService,
    private readonly taskRepository: ITaskRepository,
    private readonly notificationRepository: INotificationRepository,
    private readonly notificationService: INotificationService,
    private readonly messageQueueService: IMessageQueueService,
  ) {}

  async exportCvPdf(request: GenerateCvPdfRequestDto): Promise<Buffer> {
    let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;

    try {
      const html = request?.html?.trim();

      if (!html) {
        throw new BadRequestException({
          message: "Missing html content",
          code: RESPONSE_CODE.BAD_REQUEST,
        });
      }

      const isModernGreenTemplate =
        /data-cv-template=["']modern-green["']/.test(html);
      const isModernBlueTemplate = /data-cv-template=["']modern-blue["']/.test(
        html,
      );
      const isClassicTemplate = /data-cv-template=["']classic["']/.test(html);

      const pdfRootWidthMatch = html.match(
        /\.pdf-root\s*\{[\s\S]*?width:\s*(\d+(?:\.\d+)?)px;/,
      );

      const requestedWidth =
        typeof request?.pdfWidth === "number" &&
        Number.isFinite(request.pdfWidth)
          ? request.pdfWidth
          : null;

      const htmlWidth = pdfRootWidthMatch ? Number(pdfRootWidthMatch[1]) : null;
      const pdfRootWidthPx = Math.min(
        1240,
        Math.max(700, requestedWidth ?? htmlWidth ?? 900),
      );
      const modernGreenSidebarWidthPx = pdfRootWidthPx * 0.3495;

      const localExecutable =
        process.env.PUPPETEER_EXECUTABLE_PATH ||
        process.env.CHROME_EXECUTABLE_PATH ||
        process.env.CHROMIUM_PATH;

      const launchOptions: Parameters<typeof puppeteer.launch>[0] = {
        headless: true,
        args: [
          ...chromium.args,
          "--hide-scrollbars",
          "--disable-web-security",
          "--no-sandbox",
        ],
        defaultViewport: {
          width: 1240,
          height: 1754,
        },
      };

      if (localExecutable) {
        launchOptions.executablePath = localExecutable;
      } else {
        launchOptions.executablePath = await chromium.executablePath();
      }

      browser = await puppeteer.launch(launchOptions);

      const page = await browser.newPage();
      await page.setViewport({ width: 1240, height: 1754 });
      await page.emulateMediaType("screen");
      await page.setContent(html, { waitUntil: "load" });

      await page.addStyleTag({
        content: `
          @page {
            margin: 0;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
          }

          ${
            isModernGreenTemplate
              ? `
          body::before {
            content: "";
            position: fixed;
            top: 0;
            bottom: 0;
            left: 50%;
            transform: translateX(-${pdfRootWidthPx / 2}px);
            width: ${modernGreenSidebarWidthPx}px;
            background: #065f46;
            z-index: -1;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .pdf-root {
            position: relative;
            z-index: 1;
          }

          .pdf-root [data-cv-template="modern-green"] {
            overflow: visible !important;
            display: flex !important;
            align-items: stretch !important;
            position: relative !important;
            isolation: isolate;
          }

          .pdf-root [data-cv-template="modern-green"] > :first-child {
            align-self: stretch !important;
            -webkit-box-decoration-break: clone;
            box-decoration-break: clone;
            padding-bottom: 8mm;
          }

          .pdf-root [data-cv-template="modern-green"] > :last-child {
            -webkit-box-decoration-break: clone;
            box-decoration-break: clone;
            padding-top: 8mm;
            padding-bottom: 8mm;
            background: #ffffff !important;
          }
          `
              : ""
          }

          ${
            isModernBlueTemplate
              ? `
          .pdf-root [data-cv-template="modern-blue"] > :last-child {
            -webkit-box-decoration-break: clone;
            box-decoration-break: clone;
            padding-top: 8mm;
            padding-bottom: 8mm;
            background: #ffffff !important;
          }
          `
              : ""
          }

          ${
            isClassicTemplate
              ? `
          .pdf-root [data-cv-template="classic"] > :last-child {
            -webkit-box-decoration-break: clone;
            box-decoration-break: clone;
            padding-top: 8mm;
            padding-bottom: 8mm;
            background: #ffffff !important;
          }
          `
              : ""
          }
        `,
      });

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "0mm",
          right: "0mm",
          bottom: "0mm",
          left: "0mm",
        },
        preferCSSPageSize: true,
      });

      return Buffer.from(pdfBuffer);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.error("[AI_CV_EXPORT_PDF] Failed to generate CV PDF", error);
      throw new BadRequestException({
        message: detail,
        code: RESPONSE_CODE.BAD_REQUEST,
      });
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  async getAiCvs(userId: string): Promise<ApiResponse<AiCvListResponseDto>> {
    this.logger.log(`[getAiCvs] [get] Getting AI CVs for user ${userId}`);

    const aiCvs = await this.aiCvRepository.getByField({ userId: userId });

    const aiCvsDto: AiCvDto[] = aiCvs.map((aiCv) => ({
      ...aiCv,
      cvData: aiCv.cvData as OptimizedCvDataDto,
      editedCvData: (aiCv.editedCvData as OptimizedCvDataDto) ?? null,
      originalScoreBreakdown:
        (aiCv.originalScoreBreakdown as Record<string, any>) ?? null,
      scoreBreakdown: (aiCv.scoreBreakdown as Record<string, any>) ?? null,
      optimizationsApplied:
        (aiCv.optimizationsApplied as Record<string, any>[]) ?? null,
      language: aiCv.language as CvLanguageEnum,
      template: aiCv.template as CvTemplateEnum,
    }));

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: { aiCvs: aiCvsDto },
    };
  }

  async getAiCvById(
    aiCvId: string,
    userId: string,
  ): Promise<ApiResponse<AiCvDto>> {
    this.logger.log(`[getAiCvById] [get] Getting AI CV by id ${aiCvId}`);
    const aiCv = await this.aiCvRepository.get(aiCvId);
    if (!aiCv || aiCv.userId !== userId) {
      throw new NotFoundException({
        message: RESPONSE_MESSAGE.AI_CV_NOT_FOUND,
        code: RESPONSE_CODE.AI_CV_NOT_FOUND,
      });
    }

    const aiCvDto = {
      ...aiCv,
      editedCvData: (aiCv.editedCvData as OptimizedCvDataDto) ?? null,
      originalScoreBreakdown:
        (aiCv.originalScoreBreakdown as Record<string, any>) ?? null,
      scoreBreakdown: (aiCv.scoreBreakdown as Record<string, any>) ?? null,
      optimizationsApplied:
        (aiCv.optimizationsApplied as Record<string, any>[]) ?? null,
      updatedAt: aiCv.updatedAt ? new Date(aiCv.updatedAt) : undefined,
      createdAt: new Date(aiCv.createdAt),
    } as AiCvDto;

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: aiCvDto,
    };
  }

  async updateAiCv(
    userId: string,
    aiCvId: string,
    updateAiCvDto: UpdateAiCvDto,
  ): Promise<ApiResponse<AiCvDto>> {
    const existingAiCv = await this.aiCvRepository.get(aiCvId);
    if (!existingAiCv || existingAiCv.userId !== userId) {
      throw new BadRequestException({
        message: RESPONSE_CODE.UNAUTHORIZED,
        code: RESPONSE_CODE.AI_CV_NOT_FOUND,
      });
    }

    const updateData: Partial<NewAiCv> = {
      ...updateAiCvDto,
      updatedAt: new Date(),
      cvData: updateAiCvDto?.cvData as OptimizedCvData | undefined,
    };

    const updatedRows = await this.aiCvRepository.update(
      { id: aiCvId },
      updateData,
    );

    const updatedAiCv = updatedRows[0];
    if (!updatedAiCv) {
      throw new BadRequestException({
        message: RESPONSE_MESSAGE.AI_CV_NOT_UPDATED,
        code: RESPONSE_CODE.AI_CV_NOT_UPDATED,
      });
    }

    const transformedAiCv: AiCvDto = {
      ...updatedAiCv,
      cvData: updatedAiCv.cvData as OptimizedCvDataDto,
      editedCvData: (updatedAiCv.editedCvData as OptimizedCvDataDto) ?? null,
      originalScoreBreakdown:
        (updatedAiCv.originalScoreBreakdown as Record<string, any>) ?? null,
      scoreBreakdown:
        (updatedAiCv.scoreBreakdown as Record<string, any>) ?? null,
      optimizationsApplied:
        (updatedAiCv.optimizationsApplied as Record<string, any>[]) ?? null,
      language: updatedAiCv.language as CvLanguageEnum,
      template: updatedAiCv.template as CvTemplateEnum,
      createdAt: new Date(updatedAiCv.createdAt),
      updatedAt: updatedAiCv.updatedAt ? new Date(updatedAiCv.updatedAt) : null,
    };

    this.logger.log(`Updated AI CV ${updatedAiCv.id}: ${updatedAiCv.title}`);

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: transformedAiCv,
    };
  }

  async deleteAiCv(
    userId: string,
    aiCvId: string,
  ): Promise<ApiResponse<{ message: string }>> {
    const aiCv = await this.aiCvRepository.get(aiCvId);

    if (!aiCv || aiCv.userId !== userId) {
      throw new BadRequestException({
        message: RESPONSE_CODE.UNAUTHORIZED,
        code: RESPONSE_CODE.AI_CV_NOT_FOUND,
      });
    }

    const result = await this.aiCvRepository.deletePermanently({ id: aiCvId });

    if (result.length === 0) {
      throw new BadRequestException({
        message: RESPONSE_MESSAGE.AI_CV_NOT_DELETED,
        code: RESPONSE_CODE.AI_CV_NOT_DELETED,
      });
    }

    this.logger.log(
      `[deleteAiCv] [delete] Deleted AI CV ${aiCvId} for user ${userId}`,
    );

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: { message: RESPONSE_CODE.SUCCESS },
    };
  }

  async suggestCvField(
    request: CvFieldSuggestionRequestDto,
    userId: string,
  ): Promise<ApiResponse<CvFieldSuggestionResponseDto>> {
    this.logger.log(`Generating suggestion for field: ${request.targetField}`);

    await this.featureService.consumeFeature(
      userId,
      FeatureCodeEnum.SUGGEST_CV_FIELD,
    );

    const result = await this.aiService.suggestCvField({
      ...request,
      cvData: request.cvData as any,
    });

    const response: CvFieldSuggestionResponseDto = {
      targetField: result.targetField,
      suggestion: result.suggestion,
      generatedAt: result.generatedAt,
    };

    return {
      data: response,
      message: "Field suggestion generated successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async optimizeCvForAts(
    request: OptimizeAtsUploadDto,
    userId: string,
    useUserCV: boolean,
  ): Promise<ApiResponse<{ taskId: string }>> {
    // Extract CV text before pushing to queue
    let cvText = "";

    if (request?.file) {
      cvText = await FileTextExtractor.extractText(request.file);
      this.logger.log(`Extracted ${cvText.length} chars from CV`);
    } else if (request?.cvText) {
      cvText = request.cvText;
    } else if (useUserCV) {
      const userCvData = await this.userRepository.getUserCvData(userId);
      if (userCvData) {
        cvText = userCvDataToText(userCvData);
        this.logger.log(`Generated ${cvText.length} chars from user profile`);
      }
    }

    if (cvText.length < 100) {
      if (useUserCV) {
        throw new BadRequestException({
          message:
            "Profile content is too short. Please provide a valid profile.",
          code: RESPONSE_CODE.PROFILE_TOO_SHORT,
        });
      } else {
        throw new BadRequestException({
          message: "CV content is too short. Please provide a valid CV.",
          code: RESPONSE_CODE.BAD_REQUEST,
        });
      }
    }

    const optimizeRequest: OptimizeAtsRequest = {
      cvText,
      language: request.body.language || CvLanguageEnum.VIETNAMESE,
      ...(request.body.jobDescription && {
        jobDescription: request.body.jobDescription,
      }),
    };

    const result = await this.taskRepository.executeWithTransaction(
      async (tx) => {
        await this.featureService.consumeFeature(
          userId,
          FeatureCodeEnum.OPTIMIZE_CV,
        );

        const task = await this.taskRepository.create(
          {
            name: `Optimize AI CV for user: ${userId}`,
            type: TaskTypeEnum.CV_GENERATION,
            status: TaskStatusEnum.PENDING,
            userId,
            input: {
              request: optimizeRequest,
            },
          },
          tx,
        );

        const [notification] =
          await this.notificationRepository.createNotificationWithRecipients(
            {
              senderId: null,
              title: "CV của bạn đang được tối ưu",
              message:
                "Đang tối ưu CV dựa trên yêu cầu của bạn. Vui lòng chờ trong giây lát!",
              templateKey: "system_cv_generation_pending",
              templateData: {},
              type: NotificationType.SYSTEM,
              payload: {
                taskId: task.id,
              },
            },
            [{ receiverId: userId }],
          );
        return {
          task,
          notification,
        };
      },
    );

    await this.notificationService.sendNotification(result.notification);

    await retry(
      async () => {
        await this.messageQueueService.addTask(
          TaskTypeEnum.CV_GENERATION,
          {
            taskId: result.task.id,
            notificationId: result.notification.id,
          },
          {
            jobId: `task-async-${result.task.id}`,
          },
        );
        this.logger.log(
          `CV generation task added to message queue: ${result.task.id}`,
        );
      },
      {
        retries: 3,
        backoff: new JitterBackoff(1000, 10000),
      },
    );

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: "CV generation started",
      data: { taskId: result.task.id },
    };
  }

  async updateAiCvV2(
    userId: string,
    aiCvId: string,
    updateAiCvV2Dto: UpdateAiCvV2Dto,
  ): Promise<ApiResponse<AiCvDto>> {
    const existingAiCv = await this.aiCvRepository.get(aiCvId);
    if (!existingAiCv || existingAiCv.userId !== userId) {
      throw new BadRequestException({
        message: RESPONSE_CODE.UNAUTHORIZED,
        code: RESPONSE_CODE.AI_CV_NOT_FOUND,
      });
    }

    const updateData: Partial<NewAiCv> = {
      updatedAt: new Date(),
      editedCvData: updateAiCvV2Dto?.editedCvData as
        | OptimizedCvData
        | undefined,
    };

    const updatedRows = await this.aiCvRepository.update(
      { id: aiCvId },
      updateData,
    );

    const updatedAiCv = updatedRows[0];
    if (!updatedAiCv) {
      throw new BadRequestException({
        message: RESPONSE_MESSAGE.AI_CV_NOT_UPDATED,
        code: RESPONSE_CODE.AI_CV_NOT_UPDATED,
      });
    }

    const transformedAiCv: AiCvDto = {
      ...updatedAiCv,
      cvData: updatedAiCv.cvData as OptimizedCvDataDto,
      editedCvData: (updatedAiCv.editedCvData as OptimizedCvDataDto) ?? null,
      originalScoreBreakdown:
        (updatedAiCv.originalScoreBreakdown as Record<string, any>) ?? null,
      scoreBreakdown:
        (updatedAiCv.scoreBreakdown as Record<string, any>) ?? null,
      optimizationsApplied:
        (updatedAiCv.optimizationsApplied as Record<string, any>[]) ?? null,
      language: updatedAiCv.language as CvLanguageEnum,
      template: updatedAiCv.template as CvTemplateEnum,
      createdAt: new Date(updatedAiCv.createdAt),
      updatedAt: updatedAiCv.updatedAt ? new Date(updatedAiCv.updatedAt) : null,
    };

    this.logger.log(
      `Updated AI CV V2 (editedCvData) ${updatedAiCv.id}: ${updatedAiCv.title}`,
    );

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: transformedAiCv,
    };
  }

  async optimizeCvForAtsV2(
    request: OptimizeAtsUploadDto,
    userId: string,
    useUserCV: boolean,
  ): Promise<ApiResponse<{ taskId: string }>> {
    // Extract CV text before pushing to queue
    let cvText = "";

    if (request?.file) {
      cvText = await FileTextExtractor.extractText(request.file);
      this.logger.log(`Extracted ${cvText.length} chars from CV`);
    } else if (request?.cvText) {
      cvText = request.cvText;
    } else if (useUserCV) {
      const userCvData = await this.userRepository.getUserCvData(userId);
      if (userCvData) {
        cvText = userCvDataToText(userCvData);
        this.logger.log(`Generated ${cvText.length} chars from user profile`);
      }
    }

    if (cvText.length < 100) {
      if (useUserCV) {
        throw new BadRequestException({
          message:
            "Profile content is too short. Please provide a valid profile.",
          code: RESPONSE_CODE.PROFILE_TOO_SHORT,
        });
      } else {
        throw new BadRequestException({
          message: "CV content is too short. Please provide a valid CV.",
          code: RESPONSE_CODE.BAD_REQUEST,
        });
      }
    }

    const optimizeRequest: OptimizeAtsRequest = {
      cvText,
      language: request.body.language || CvLanguageEnum.VIETNAMESE,
      ...(request.body.jobDescription && {
        jobDescription: request.body.jobDescription,
      }),
    };

    const result = await this.taskRepository.executeWithTransaction(
      async (tx) => {
        await this.featureService.consumeFeature(
          userId,
          FeatureCodeEnum.OPTIMIZE_CV,
        );

        const task = await this.taskRepository.create(
          {
            name: `Optimize AI CV V2 for user: ${userId}`,
            type: TaskTypeEnum.CV_GENERATION_V2,
            status: TaskStatusEnum.PENDING,
            userId,
            input: {
              request: optimizeRequest,
            },
          },
          tx,
        );

        const [notification] =
          await this.notificationRepository.createNotificationWithRecipients(
            {
              senderId: null,
              title: "CV của bạn đang được tối ưu",
              message:
                "Đang tối ưu CV dựa trên yêu cầu của bạn. Vui lòng chờ trong giây lát!",
              templateKey: "system_cv_generation_pending",
              templateData: {},
              type: NotificationType.SYSTEM,
              payload: {
                taskId: task.id,
              },
            },
            [{ receiverId: userId }],
          );
        return {
          task,
          notification,
        };
      },
    );

    await this.notificationService.sendNotification(result.notification);

    await retry(
      async () => {
        await this.messageQueueService.addTask(
          TaskTypeEnum.CV_GENERATION_V2,
          {
            taskId: result.task.id,
            notificationId: result.notification.id,
          },
          {
            jobId: `task-async-${result.task.id}`,
          },
        );
        this.logger.log(
          `CV generation V2 task added to message queue: ${result.task.id}`,
        );
      },
      {
        retries: 3,
        backoff: new JitterBackoff(1000, 10000),
      },
    );

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: "CV generation V2 started",
      data: { taskId: result.task.id },
    };
  }
}
