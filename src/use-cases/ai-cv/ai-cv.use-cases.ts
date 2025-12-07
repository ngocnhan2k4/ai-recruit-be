import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants/response";
import { CvLanguageEnum } from "@/core";
import { IAiCvRepository } from "@/core/abstracts/repositories/ai-cv-repository.abstract";
import { ApiResponse } from "@/interfaces/dtos";
import {
  AiCvDto,
  AiCvListResponseDto,
  OptimizedCvDataDto,
} from "@/interfaces/dtos/ai-cv/ai-cv.dto";
import { Inject, Injectable, Logger } from "@nestjs/common";

@Injectable()
export class AiCvUseCases {
  private readonly logger = new Logger(AiCvUseCases.name);
  constructor(
    @Inject(IAiCvRepository) private readonly aiCvRepository: IAiCvRepository,
  ) {}

  async getAiCvs(userId: string): Promise<ApiResponse<AiCvListResponseDto>> {
    this.logger.log(`[getAiCvs] [get] Getting AI CVs for user ${userId}`);

    // Fetch from Repository
    const aiCvs = await this.aiCvRepository.getByField({ userId: userId });

    // Map Entity -> DTO
    const aiCvsDto: AiCvDto[] = aiCvs.map((aiCv) => ({
      id: aiCv.id,
      userId: aiCv.userId,
      title: aiCv.title,
      targetJobTitle: aiCv.targetJobTitle,
      cvData: aiCv.cvData as OptimizedCvDataDto,
      atsScore: aiCv.atsScore,
      matchingSkills: aiCv.matchingSkills,
      missingSkills: aiCv.missingSkills,
      recommendation: aiCv.recommendation,
      jobDescription: aiCv.jobDescription,
      originalCvFilename: aiCv.originalCvFilename,
      language: aiCv.language as CvLanguageEnum,
      isFavorite: aiCv.isFavorite,
      createdAt: aiCv.createdAt,
      updatedAt: aiCv.updatedAt,
    }));

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: { aiCvs: aiCvsDto },
    };
  }
}
