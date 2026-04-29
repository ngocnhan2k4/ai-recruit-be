import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiResponse } from "@/interfaces/dtos";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants";
import { Environment } from "@/common/config";
import { ICvRepository, ISearchService } from "@/core/abstracts";
import {
  getCvIndexMapping,
  transformCvToDocument,
} from "@/frameworks/data-services/elasticsearch/indices/cv.index";
import {
  SyncFromElasticsearchRequestDto,
  SyncFromElasticsearchResponseDto,
} from "@/interfaces/dtos";
import { CvService } from "@/services/cv/cv.service";
import { mapWithConcurrency } from "@/common/utils";

@Injectable()
export class CvSyncUseCases {
  private readonly logger = new Logger(CvSyncUseCases.name);

  constructor(
    private readonly searchService: ISearchService,
    private readonly configService: ConfigService,
    private readonly cvRepository: ICvRepository,
    private readonly cvService: CvService,
  ) {}

  private indexName(): string {
    return this.configService.get<string>("ELASTICSEARCH_INDEX_CVS") || "cvs";
  }

  private async ensureIndex(): Promise<void> {
    const exists = await this.searchService.existsIndex(this.indexName());
    if (!exists) {
      const indexMapping = getCvIndexMapping({
        env: this.configService.get<Environment>("NODE_ENV")!,
      });
      await this.searchService.createIndex(this.indexName(), indexMapping);
      this.logger.log(`Created index: ${this.indexName()}`);
    }
  }

  async initializeIndex(): Promise<ApiResponse<{ message: string }>> {
    await this.ensureIndex();
    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: { message: "Elasticsearch CV index initialized successfully" },
    };
  }

  /**
   * Full ES sync: same pipeline as {@link CvIndexWorker} — get CV from repo,
   * extract structured data via {@link CvService}, then index documents in batches.
   */
  async syncAllCompletedCvs(): Promise<
    ApiResponse<{ totalSynced: number; message: string }>
  > {
    this.logger.log("Starting manual sync of completed CVs...");
    await this.ensureIndex();

    const batchSize = 100;
    let page = 1;
    let hasMore = true;
    let totalSynced = 0;

    const documents: Array<{ id: string; document: Record<string, unknown> }> =
      [];

    while (hasMore) {
      const rows = await this.cvRepository.getCvs({ page, limit: batchSize });
      if (rows.data.length === 0) {
        hasMore = false;
        break;
      }

      let results = await mapWithConcurrency(
        rows.data,
        async (cv) => {
          const cvId = cv.id;

          const extractedData = await this.cvService.extractCv(cv);

          const document = transformCvToDocument({
            id: cv.id,
            userId: cv.userId,
            aiCvId: cv.aiCvId,
            name: extractedData.name || cv.name,
            fileUrl: cv.fileUrl,
            mimeType: cv.mimeType,
            updatedAt: cv.updatedAt ?? null,
            skillIds: extractedData.skillIds || [],
            provinceIds: extractedData.provinceIds || [],
            categoryIds: extractedData.categoryIds || [],
            experienceYears: extractedData.experienceYears ?? undefined,
            skillNames: extractedData.skillNames || [],
            provinceNames: extractedData.provinceNames || [],
            categoryNames: extractedData.categoryNames || [],
            experienceLevel: extractedData.experienceLevel ?? undefined,
          });

          return { id: cvId, document };
        },
        { continueOnError: true },
      );

      results = results.filter((result) => result !== undefined);
      documents.push(...results);

      page += 1;
    }
    if (documents.length > 0) {
      const result = await this.searchService.bulkIndex(
        this.indexName(),
        documents,
      );
      totalSynced += result.success;
      this.logger.log(
        `Synced batch: ${result.success} cvs (total: ${totalSynced})`,
      );
    }

    this.logger.log(`Full CV sync completed: ${totalSynced} cvs synced`);
    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: {
        totalSynced,
        message: "All completed CVs synced successfully",
      },
    };
  }

  async getSyncStatus(): Promise<
    ApiResponse<{
      esCount: number;
      dbCount: number;
    }>
  > {
    const indexName = this.indexName();

    const exists = await this.searchService.existsIndex(indexName);
    const esCount = exists
      ? Number(await this.searchService.countDocuments(indexName))
      : 0;

    const dbCount = await this.cvRepository.count();

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: {
        esCount,
        dbCount,
      },
    };
  }

  async deleteCvsIndex(): Promise<ApiResponse<{ message: string }>> {
    const indexName = this.indexName();
    await this.searchService.deleteIndex(indexName);
    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: { message: `Index ${indexName} deleted successfully` },
    };
  }

  async deleteCv(cvId: string): Promise<ApiResponse<{ message: string }>> {
    await this.searchService.deleteByQuery(this.indexName(), {
      term: {
        id: cvId,
      },
    });
    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: { message: `CV ${cvId} deleted from search index successfully` },
    };
  }

  async syncFromElasticsearch(
    dto: SyncFromElasticsearchRequestDto,
  ): Promise<ApiResponse<SyncFromElasticsearchResponseDto>> {
    this.logger.log(
      `Starting CV sync from remote ES: ${dto.sourceNode}/${dto.sourceIndex}`,
    );

    const targetIndex = dto.targetIndex || this.indexName();

    const sourceAuth =
      dto.sourceUsername && dto.sourcePassword
        ? { username: dto.sourceUsername, password: dto.sourcePassword }
        : undefined;

    const reindexResult = await this.searchService.reindexFromRemote(
      dto.sourceNode,
      dto.sourceIndex,
      targetIndex,
      sourceAuth,
      dto.query,
    );

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: {
        total: reindexResult.total,
        took: reindexResult.took,
        message: `Successfully synced ${reindexResult.total} documents from ${dto.sourceIndex} to ${targetIndex}`,
      },
    };
  }
}
