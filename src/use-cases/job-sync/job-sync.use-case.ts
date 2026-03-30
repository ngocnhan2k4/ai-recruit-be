import { Injectable, Logger } from "@nestjs/common";
import { ApiResponse } from "@/interfaces/dtos";
import { RESPONSE_MESSAGE, RESPONSE_CODE } from "@/common/constants";
import { IJobRepository, ISearchService, JobStatusEnum } from "@/core";
import {
  getJobIndexMapping,
  transformJobToDocument,
} from "@/frameworks/data-services/elasticsearch/indices/job.index";
import { ConfigService } from "@nestjs/config";
import { Environment } from "@/common/config";
import { SyncFromElasticsearchRequestDto } from "@/interfaces/dtos";
import { SyncFromElasticsearchResponseDto } from "@/interfaces/dtos";

@Injectable()
export class JobSyncUseCases {
  private readonly logger = new Logger(JobSyncUseCases.name);

  constructor(
    private readonly searchService: ISearchService,
    private readonly jobRepository: IJobRepository,
    private readonly configService: ConfigService,
  ) {}

  private async ensureIndex(): Promise<void> {
    const client = this.searchService.getClient();
    const indexName = this.configService.get<string>(
      "ELASTICSEARCH_INDEX_JOBS",
    )!;
    const exists = await client.indices.exists({
      index: indexName,
    });
    if (!exists) {
      const indexMapping = getJobIndexMapping({
        env: this.configService.get<Environment>("NODE_ENV")!,
      });
      await this.searchService.createIndex(indexName, indexMapping);
      this.logger.log(`Created index: ${indexName}`);
    }
  }

  private async getSyncableJobsBatch(page: number, limit: number) {
    const result = await this.jobRepository.getJobsByAdmin({
      limit,
      page,
      status: JobStatusEnum.ACTIVE,
    });
    return result.data.filter((item) => item.category != null);
  }

  /**
   * Initialize Elasticsearch index
   */
  async initializeIndex(): Promise<ApiResponse<{ message: string }>> {
    try {
      await this.ensureIndex();
      this.logger.log("Elasticsearch index initialized successfully");
      return {
        message: RESPONSE_MESSAGE.SUCCESS,
        code: RESPONSE_CODE.SUCCESS,
        data: {
          message: "Elasticsearch index initialized successfully",
        },
      };
    } catch (error) {
      this.logger.error("Failed to initialize index", error);
      throw error;
    }
  }

  /**
   * Sync all active jobs to Elasticsearch
   */
  async syncAllActiveJobs(): Promise<
    ApiResponse<{ totalSynced: number; message: string }>
  > {
    this.logger.log("Starting manual sync of all active jobs...");

    const batchSize = 100;
    let page = 1;
    let hasMore = true;
    let totalSynced = 0;

    while (hasMore) {
      const data = await this.getSyncableJobsBatch(page, batchSize);

      if (data.length === 0) {
        hasMore = false;
        break;
      }

      const documents = data.map((item) => ({
        id: item.job.id,
        document: transformJobToDocument(item),
      }));

      if (documents.length > 0) {
        const result = await this.searchService.bulkIndex(
          this.configService.get<string>("ELASTICSEARCH_INDEX_JOBS")!,
          documents,
        );
        totalSynced += result.success;
        this.logger.log(
          `Synced batch: ${result.success} jobs (total: ${totalSynced})`,
        );
      }

      page += 1;
    }

    this.logger.log(`Full sync completed: ${totalSynced} jobs synced`);
    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: {
        totalSynced,
        message: "All active jobs synced successfully",
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
    const indexName = this.configService.get<string>(
      "ELASTICSEARCH_INDEX_JOBS",
    )!;

    const exists = await client.indices.exists({ index: indexName });
    const esCount = exists
      ? Number((await client.count({ index: indexName })).count ?? 0)
      : 0;
    const dbCount = await this.jobRepository.count({ isCategoryNotNull: true });

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: {
        esCount,
        dbCount,
      },
    };
  }

  /**
   * Delete a job from Elasticsearch
   */
  async deleteJob(jobId: string): Promise<ApiResponse<{ message: string }>> {
    await this.searchService.deleteByQuery(
      this.configService.get<string>("ELASTICSEARCH_INDEX_JOBS")!,
      {
        term: {
          id: jobId,
        },
      },
    );
    this.logger.log(`Job ${jobId} deleted from search index`);
    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: {
        message: `Job ${jobId} deleted from search index successfully`,
      },
    };
  }

  /**
   * Delete the whole jobs Elasticsearch index
   */
  async deleteJobsIndex(): Promise<ApiResponse<{ message: string }>> {
    const indexName = this.configService.get<string>(
      "ELASTICSEARCH_INDEX_JOBS",
    )!;
    await this.searchService.deleteIndex(indexName);
    this.logger.log(`Index ${indexName} deleted`);
    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: {
        message: `Index ${indexName} deleted successfully`,
      },
    };
  }

  /**
   * Sync data from another Elasticsearch instance
   */
  async syncFromElasticsearch(
    dto: SyncFromElasticsearchRequestDto,
  ): Promise<ApiResponse<SyncFromElasticsearchResponseDto>> {
    this.logger.log(
      `Starting sync from remote ES: ${dto.sourceNode}/${dto.sourceIndex}`,
    );

    // Ensure target index exists
    const targetIndex =
      dto.targetIndex ||
      this.configService.get<string>("ELASTICSEARCH_INDEX_JOBS")!;
    await this.ensureIndex();

    const sourceAuth =
      dto.sourceUsername && dto.sourcePassword
        ? {
            username: dto.sourceUsername,
            password: dto.sourcePassword,
          }
        : undefined;

    const reindexResult = await this.searchService.reindexFromRemote(
      dto.sourceNode,
      dto.sourceIndex,
      targetIndex,
      sourceAuth,
      dto.query,
    );
    const result = {
      total: reindexResult.total,
      took: reindexResult.took,
      message: `Successfully synced ${reindexResult.total} documents from ${dto.sourceIndex} to ${targetIndex}`,
    };

    this.logger.log(
      `Sync completed: ${result.total} documents synced to ${targetIndex}`,
    );

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: result,
    };
  }
}
