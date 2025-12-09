import { Injectable, Logger } from "@nestjs/common";
import { ApiResponse } from "@/interfaces/dtos";
import { RESPONSE_MESSAGE, RESPONSE_CODE } from "@/common/constants/response";
import { ElasticsearchService } from "@/frameworks/data-services/elasticsearch/elasticsearch.service";
import { IJobRepository } from "@/core";
import {
  JOB_INDEX_NAME,
  jobIndexMapping,
  transformJobToDocument,
} from "@/frameworks/data-services/elasticsearch/indices/job.index";

@Injectable()
export class JobSyncUseCases {
  private readonly logger = new Logger(JobSyncUseCases.name);

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly jobRepository: IJobRepository,
  ) {}

  private async ensureIndex(): Promise<void> {
    const client = this.elasticsearchService.getClient();
    const exists = await client.indices.exists({ index: JOB_INDEX_NAME });
    if (!exists) {
      await this.elasticsearchService.createIndex(
        JOB_INDEX_NAME,
        jobIndexMapping,
      );
      this.logger.log(`Created index: ${JOB_INDEX_NAME}`);
    }
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
    try {
      this.logger.log("Starting manual sync of all active jobs...");
      await this.ensureIndex();

      const batchSize = 100;
      let offset = 0;
      let hasMore = true;
      let totalSynced = 0;

      while (hasMore) {
        const data = await this.jobRepository.getJobsByAdmin({
          limit: batchSize,
          page: offset / batchSize + 1,
        });

        if (data.data.length === 0) {
          hasMore = false;
          break;
        }

        const documents = data.data.map((item) => ({
          id: item.job.id,
          document: transformJobToDocument(item),
        }));

        if (documents.length > 0) {
          const result = await this.elasticsearchService.bulkIndex(
            JOB_INDEX_NAME,
            documents,
          );
          totalSynced += result.success;
          this.logger.log(
            `Synced batch: ${result.success} jobs (total: ${totalSynced})`,
          );
        }

        offset += batchSize;
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
    } catch (error) {
      this.logger.error("Failed to sync all active jobs", error);
      throw error;
    }
  }

  /**
   * Delete a job from Elasticsearch
   */
  async deleteJob(jobId: string): Promise<ApiResponse<{ message: string }>> {
    try {
      await this.elasticsearchService.deleteDocument(JOB_INDEX_NAME, jobId);
      this.logger.log(`Job ${jobId} deleted from Elasticsearch`);
      return {
        message: RESPONSE_MESSAGE.SUCCESS,
        code: RESPONSE_CODE.SUCCESS,
        data: {
          message: `Job ${jobId} deleted from Elasticsearch successfully`,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to delete job ${jobId}`, error);
      throw error;
    }
  }
}
