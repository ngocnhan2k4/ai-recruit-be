import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants";
import { FileTextExtractor, userCvDataToText } from "@/common/utils";
import {
  CvLanguageEnum,
  CvTemplateEnum,
  IAIService,
  IMessageQueueService,
  INotificationRepository,
  ITaskRepository,
  IUserFeatureUsageRepository,
  IUserRepository,
  IWebSocketGateway,
  NewAiCv,
  OptimizeAtsResponse,
  FeatureCodeEnum,
  NotificationType,
  TaskTypeEnum,
  TaskStatusEnum,
} from "@/core";
import { IAiCvRepository } from "@/core/abstracts/repositories/ai-cv-repository.abstract";
import {
  ApiResponse,
  CvFieldSuggestionRequestDto,
  CvFieldSuggestionResponseDto,
  OptimizeAtsUploadDto,
  AiCvDto,
  AiCvListResponseDto,
  AiCvRequestDto,
  OptimizedCvDataDto,
  UpdateAiCvDto,
} from "@/interfaces/dtos";
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { JitterBackoff, retry } from "@/common/utils";

@Injectable()
export class AiCvUseCases {
  private readonly logger = new Logger(AiCvUseCases.name);
  constructor(
    @Inject(IAiCvRepository) private readonly aiCvRepository: IAiCvRepository,
    @Inject(IAIService) private readonly aiService: IAIService,
    private readonly userRepository: IUserRepository,
    private readonly userFeatureUsageRepository: IUserFeatureUsageRepository,
    private readonly taskRepository: ITaskRepository,
    private readonly notificationRepository: INotificationRepository,
    private readonly webSocketGateway: IWebSocketGateway,
    private readonly messageQueueService: IMessageQueueService,
  ) {}

  async getAiCvs(userId: string): Promise<ApiResponse<AiCvListResponseDto>> {
    this.logger.log(`[getAiCvs] [get] Getting AI CVs for user ${userId}`);

    const aiCvs = await this.aiCvRepository.getByField({ userId: userId });

    const aiCvsDto: AiCvDto[] = aiCvs.map((aiCv) => ({
      ...aiCv,
      cvData: aiCv.cvData as OptimizedCvDataDto,
      language: aiCv.language as CvLanguageEnum,
      template: aiCv.template as CvTemplateEnum,
    }));

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: { aiCvs: aiCvsDto },
    };
  }

  async getAiCvById(aiCvId: string): Promise<ApiResponse<AiCvDto>> {
    this.logger.log(`[getAiCvById] [get] Getting AI CV by id ${aiCvId}`);
    const aiCv = await this.aiCvRepository.get(aiCvId);
    if (!aiCv) {
      throw new NotFoundException({
        message: RESPONSE_MESSAGE.AI_CV_NOT_FOUND,
        code: RESPONSE_CODE.AI_CV_NOT_FOUND,
      });
    }

    const aiCvDto = {
      ...aiCv,
      updatedAt: aiCv.updatedAt ? new Date(aiCv.updatedAt) : undefined,
      createdAt: new Date(aiCv.createdAt),
    } as AiCvDto;

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: aiCvDto,
    };
  }

  async createAiCv(
    userId: string,
    createAiCvDto: AiCvRequestDto,
  ): Promise<ApiResponse<AiCvDto>> {
    const aiCvData: NewAiCv = {
      ...createAiCvDto,
      userId: userId,
      isFavorite: createAiCvDto.isFavorite ?? false,
      language: createAiCvDto.language ?? CvLanguageEnum.VIETNAMESE,
      template: createAiCvDto.template ?? CvTemplateEnum.CLASSIC,
    };

    const newAiCv = await this.aiCvRepository.create(aiCvData);

    const transformedAiCv: AiCvDto = {
      ...newAiCv,
      cvData: newAiCv.cvData as OptimizedCvDataDto,
      language: newAiCv.language as CvLanguageEnum,
      template: newAiCv.template as CvTemplateEnum,
      createdAt: new Date(newAiCv.createdAt),
      updatedAt: newAiCv.updatedAt ? new Date(newAiCv.updatedAt) : null,
    };

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: transformedAiCv,
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

    await this.userFeatureUsageRepository.consumeFeature(
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
  ): Promise<ApiResponse<OptimizeAtsResponse>> {
    // Call AI service to optimize CV
    await this.userFeatureUsageRepository.consumeFeature(
      userId,
      FeatureCodeEnum.OPTIMIZE_CV,
    );
    try {
      let cvText = "";

      if (request?.file) {
        cvText = await FileTextExtractor.extractText(request.file);

        this.logger.log(`Extracted ${cvText.length} chars from CV`);
      } else if (request?.cvText) {
        cvText = request.cvText;
      } else if (useUserCV) {
        // Generate CV text from user profile data
        const userCvData = await this.userRepository.getUserCvData(userId);
        if (userCvData) {
          cvText = userCvDataToText(userCvData);
          this.logger.log(`Generated ${cvText.length} chars from user profile`);
        }
      }

      const optimizeRequest = {
        cvText,
        language: request.body.language || CvLanguageEnum.VIETNAMESE,
        ...(request.body.jobDescription && {
          jobDescription: request.body.jobDescription,
        }),
      };

      this.logger.log(
        request.body.jobDescription
          ? "Performing targeted ATS optimization with job description"
          : "Performing general ATS optimization",
      );

      const result = await this.aiService.optimizeCvAts(optimizeRequest);

      result.language = request.body.language!;

      return {
        data: result,
        message: "CV optimized successfully",
        code: RESPONSE_CODE.SUCCESS,
      };
    } catch (error) {
      this.logger.error(error);
      throw new BadRequestException({
        message: error,
        code: RESPONSE_CODE.CV_OPTIMIZATION_FAILED,
      });
    }
  }

  async optimizeCvForAtsV2(
    request: OptimizeAtsUploadDto,
    userId: string,
    _: boolean,
  ): Promise<ApiResponse<{ taskId: string }>> {
    const result = await this.userFeatureUsageRepository.executeWithTransaction(
      async (tx) => {
        await this.userFeatureUsageRepository.consumeFeature(
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
              request,
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
              type: NotificationType.SYSTEM,
              payload: {
                taskId: task.id,
              },
            },
            [{ receiverId: userId }],
            tx,
          );
        return {
          task,
          notification,
        };
      },
    );

    this.webSocketGateway.sendToUser({ userId }, result.notification);

    await retry(
      async () => {
        await this.messageQueueService.addTask(TaskTypeEnum.CV_GENERATION, {
          taskId: result.task.id,
          notificationId: result.notification.id,
        });
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
}
