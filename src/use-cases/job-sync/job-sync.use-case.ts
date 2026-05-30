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

@Injectable()
export class JobSyncUseCases {
  private readonly logger = new Logger(JobSyncUseCases.name);

  constructor(
    private readonly searchService: ISearchService,
    private readonly jobRepository: IJobRepository,
    private readonly configService: ConfigService,
  ) {}

  private async ensureIndex(): Promise<void> {
    const indexName = this.configService.get<string>(
      "ELASTICSEARCH_INDEX_JOBS",
    )!;
    const exists = await this.searchService.existsIndex(indexName);
    if (!exists) {
      const indexMapping = getJobIndexMapping({
        env: this.configService.get<Environment>("NODE_ENV")!,
      });
      await this.searchService.createIndex(indexName, indexMapping);
      this.logger.log(`Created index: ${indexName}`);
    }
  }

  /**
   * Initialize Elasticsearch index
   */
  async initializeIndex(): Promise<ApiResponse<{ message: string }>> {
    await this.ensureIndex();
    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: {
        message: "Elasticsearch index initialized successfully",
      },
    };
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
      const result = await this.jobRepository.getJobsByAdmin({
        limit: batchSize,
        page,
        status: JobStatusEnum.ACTIVE,
      });
      const data = result.data.filter((item) => item.category != null);

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
    const indexName = this.configService.get<string>(
      "ELASTICSEARCH_INDEX_JOBS",
    )!;
    const exists = await this.searchService.existsIndex(indexName);
    const esCount = exists
      ? Number(await this.searchService.countDocuments(indexName))
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
}
