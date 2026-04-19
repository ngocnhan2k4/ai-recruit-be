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
    const client = this.searchService.getClient();
    const indexName = this.indexName();
    const exists = await client.indices.exists({ index: indexName });
    if (!exists) {
      const indexMapping = getCvIndexMapping({
        env: this.configService.get<Environment>("NODE_ENV")!,
      });
      await this.searchService.createIndex(indexName, indexMapping);
      this.logger.log(`Created index: ${indexName}`);
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

    while (hasMore) {
      const rows = await this.cvRepository.getCvs({ page, limit: batchSize });
      if (rows.length === 0) {
        hasMore = false;
        break;
      }

      const documents: Array<{
        id: string;
        document: Record<string, unknown>;
      }> = [];

      // [TODO]: Fix here, if exist aiCvId, should data in aiCv instead of extracted data
      for (const row of rows) {
        const cvId = row.id;

        const extractedData = await this.cvService.extractCvFromUrl(
          row.fileUrl,
        );

        const document = transformCvToDocument({
          id: cvId,
          userId: row.userId,
          name: extractedData.name || row.name,
          fileUrl: row.fileUrl,
          mimeType: row.mimeType,
          updatedAt: row.updatedAt ?? null,
          skillIds: extractedData.skillIds || [],
          provinceIds: extractedData.provinceIds || [],
          categoryIds: extractedData.categoryIds || [],
          expectedSalary: extractedData.expectedSalary,
          experienceYears: extractedData.experienceYears,
          skillNames: extractedData.skillNames || [],
          provinceNames: extractedData.provinceNames || [],
          categoryNames: extractedData.categoryNames || [],
        });

        documents.push({ id: cvId, document });
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

      page += 1;
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
    const client = this.searchService.getClient();
    const indexName = this.indexName();

    const exists = await client.indices.exists({ index: indexName });
    const esCount = exists
      ? Number((await client.count({ index: indexName })).count ?? 0)
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
    await this.ensureIndex();

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
