import { Injectable, Logger } from "@nestjs/common";
import { ApiResponse } from "@/interfaces/dtos";
import { RESPONSE_MESSAGE, RESPONSE_CODE } from "@/common/constants";
import {
  IJobRepository,
  ISearchService,
  JobStatusEnum,
  IAIService,
} from "@/core";
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
    private readonly aiService: IAIService,
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

    const batchSize = 50;
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

      const textsToEmbed: string[] = [];
      const jobsToEmbed: any[] = [];
      const existingEmbeddingsMap = new Map<string, number[]>();

      for (const item of data) {
        const jobId = item.job.id;
        const embedding = (item.job as any).embedding as number[] | undefined;

        if (embedding && embedding.length > 0) {
          existingEmbeddingsMap.set(jobId, embedding);
        } else {
          textsToEmbed.push(
            `${item.job.title} ${item.job.description || ""} ${item.skills.map((s: any) => s.name).join(" ")} ${item.category.name || ""}`,
          );
          jobsToEmbed.push(item);
        }
      }

      let newEmbeddings: number[][] = [];
      if (textsToEmbed.length > 0) {
        try {
          newEmbeddings = await this.aiService.generateEmbeddings(textsToEmbed);
          // Optional: Save newly generated embeddings to DB if applicable
          for (let i = 0; i < jobsToEmbed.length; i++) {
            await this.jobRepository.updateJob(jobsToEmbed[i].job.id, {
              embedding: newEmbeddings[i],
            });
          }
        } catch (e: any) {
          this.logger.warn(
            `Failed to generate embeddings for batch: ${e.message}`,
          );
        }
      }

      const documents = data.map((item) => {
        const jobId = item.job.id;
        let finalEmbedding = existingEmbeddingsMap.get(jobId);

        if (!finalEmbedding && jobsToEmbed.includes(item)) {
          const idx = jobsToEmbed.indexOf(item);
          finalEmbedding = newEmbeddings[idx];
        }

        return {
          id: jobId,
          document: transformJobToDocument({
            ...item,
            embedding: finalEmbedding,
          }),
        };
      });

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

  /**
   * Sync all active jobs' embeddings to Elasticsearch
   */
  async syncAllJobEmbeddings(): Promise<
    ApiResponse<{ totalSynced: number; message: string }>
  > {
    this.logger.log("Starting manual sync of all active jobs' embeddings...");

    const batchSize = 50;
    let page = 1;
    let hasMore = true;
    let totalSynced = 0;
    const indexName = this.configService.get<string>(
      "ELASTICSEARCH_INDEX_JOBS",
    )!;

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

      const jobsToSyncToEs: { item: any; embedding: number[] }[] = [];
      const jobsToGenerateEmbedding: any[] = [];

      for (const item of data) {
        const embedding = (item.job as any).embedding as number[] | undefined;

        if (!embedding || embedding.length === 0) {
          jobsToGenerateEmbedding.push(item);
        } else {
          jobsToSyncToEs.push({ item, embedding });
        }
      }

      // 2. Batch generate missing embeddings
      if (jobsToGenerateEmbedding.length > 0) {
        const textsToEmbed = jobsToGenerateEmbedding.map(
          (item) =>
            `${item.job.title} ${item.job.description || ""} ${item.skills.map((s: any) => s.name).join(" ")} ${item.category.name || ""}`,
        );
        try {
          const embeddings =
            await this.aiService.generateEmbeddings(textsToEmbed);

          // Update DB and prepare for ES
          for (let i = 0; i < jobsToGenerateEmbedding.length; i++) {
            const item = jobsToGenerateEmbedding[i];
            const embedding = embeddings[i];
            await this.jobRepository.updateJob(item.job.id, { embedding });
            jobsToSyncToEs.push({ item, embedding });
          }
          this.logger.log(
            `Generated and updated embeddings for ${jobsToGenerateEmbedding.length} jobs in DB`,
          );
        } catch (e: any) {
          this.logger.error(`Failed to generate embeddings: ${e.message}`);
        }
      }

      // 3. Bulk index to ES
      const documentsToIndex = jobsToSyncToEs.map(({ item, embedding }) => ({
        id: item.job.id,
        document: transformJobToDocument({
          ...item,
          embedding,
        }),
      }));

      if (documentsToIndex.length > 0) {
        const bulkResult = await this.searchService.bulkIndex(
          indexName,
          documentsToIndex,
        );
        totalSynced += bulkResult.success;
        this.logger.log(
          `Synced embedding batch: ${bulkResult.success} jobs (total: ${totalSynced})`,
        );
      }

      page += 1;
    }

    this.logger.log(
      `Full embedding sync completed: ${totalSynced} jobs synced`,
    );
    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: {
        totalSynced,
        message: "All active jobs' embeddings synced successfully",
      },
    };
  }
}
