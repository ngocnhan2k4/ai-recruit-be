/**
 * Example: Job Sync Service
 *
 * File location: src/frameworks/data-services/elasticsearch/sync/job-sync.service.ts
 *
 * Service này chịu trách nhiệm đồng bộ dữ liệu từ PostgreSQL sang Elasticsearch
 */

import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ElasticsearchService } from "../elasticsearch.service";
import { IJobRepository } from "@/core";
import {
  JOB_INDEX_NAME,
  jobIndexMapping,
  transformJobToDocument,
} from "../indices/job.index";

@Injectable()
export class JobSyncService {
  private readonly logger = new Logger(JobSyncService.name);
  private isInitialized = false;

  constructor(
    private elasticsearchService: ElasticsearchService,
    private jobRepository: IJobRepository,
  ) {}

  /**
   * Initialize index (chạy một lần khi start app)
   */
  async initializeIndex(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      const client = await this.elasticsearchService.getClient();
      const exists = await client.indices.exists({
        index: JOB_INDEX_NAME,
      });

      if (!exists) {
        await this.elasticsearchService.createIndex(
          JOB_INDEX_NAME,
          jobIndexMapping,
        );
        this.logger.log(`Created index: ${JOB_INDEX_NAME}`);
      } else {
        this.logger.log(`Index ${JOB_INDEX_NAME} already exists`);
      }

      this.isInitialized = true;
    } catch (error) {
      this.logger.error("Failed to initialize index", error);
      throw error;
    }
  }

  /**
   * Sync một job cụ thể
   */
  async syncJob(jobId: string): Promise<void> {
    try {
      // Lấy job từ PostgreSQL với đầy đủ relations
      const job = await this.jobRepository.findByIdWithRelations(jobId);

      if (!job) {
        // Job không tồn tại, xóa khỏi Elasticsearch
        await this.deleteJob(jobId);
        return;
      }

      // Transform và index vào Elasticsearch
      const document = transformJobToDocument(job);
      await this.elasticsearchService.indexDocument(
        JOB_INDEX_NAME,
        jobId,
        document,
      );

      this.logger.debug(`Synced job: ${jobId}`);
    } catch (error) {
      this.logger.error(`Failed to sync job ${jobId}`, error);
      throw error;
    }
  }

  /**
   * Sync nhiều jobs (batch)
   */
  async syncJobs(jobIds: string[]): Promise<void> {
    if (jobIds.length === 0) {
      return;
    }

    try {
      const jobs = await this.jobRepository.findByIdsWithRelations(jobIds);
      const documents = jobs.map((job) => ({
        id: job.id,
        document: transformJobToDocument(job),
      }));

      const result = await this.elasticsearchService.bulkIndex(
        JOB_INDEX_NAME,
        documents,
      );

      this.logger.log(`Synced ${result.success} jobs, ${result.failed} failed`);
    } catch (error) {
      this.logger.error("Failed to sync jobs", error);
      throw error;
    }
  }

  /**
   * Sync tất cả active jobs (initial sync)
   */
  async syncAllActiveJobs(): Promise<void> {
    this.logger.log("Starting full sync of active jobs...");

    try {
      await this.initializeIndex();

      const batchSize = 1000;
      let offset = 0;
      let hasMore = true;
      let totalSynced = 0;

      while (hasMore) {
        // Lấy jobs từ PostgreSQL
        // Note: Cần implement method này trong JobRepository
        const jobs = await this.jobRepository.findActiveJobs({
          limit: batchSize,
          offset,
        });

        if (jobs.length === 0) {
          hasMore = false;
          break;
        }

        // Transform và bulk index
        const documents = jobs.map((job) => ({
          id: job.id,
          document: transformJobToDocument(job),
        }));

        const result = await this.elasticsearchService.bulkIndex(
          JOB_INDEX_NAME,
          documents,
        );

        totalSynced += result.success;
        offset += batchSize;

        this.logger.log(
          `Synced batch: ${result.success} jobs (total: ${totalSynced})`,
        );
      }

      this.logger.log(`Full sync completed: ${totalSynced} jobs synced`);
    } catch (error) {
      this.logger.error("Full sync failed", error);
      throw error;
    }
  }

  /**
   * Xóa job khỏi Elasticsearch
   */
  async deleteJob(jobId: string): Promise<void> {
    try {
      await this.elasticsearchService.deleteDocument(JOB_INDEX_NAME, jobId);
      this.logger.debug(`Deleted job from index: ${jobId}`);
    } catch (error) {
      this.logger.error(`Failed to delete job ${jobId}`, error);
    }
  }

  /**
   * Sync jobs được update trong 24h qua (incremental sync)
   * Chạy định kỳ mỗi giờ
   */
  @Cron(CronExpression.EVERY_HOUR)
  async incrementalSync(): Promise<void> {
    this.logger.log("Starting incremental sync...");

    try {
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 24);

      // Lấy jobs được update trong 24h qua
      // Note: Cần implement method này trong JobRepository
      const updatedJobs = await this.jobRepository.findUpdatedSince(yesterday);

      if (updatedJobs.length === 0) {
        this.logger.log("No jobs to sync");
        return;
      }

      await this.syncJobs(updatedJobs.map((job) => job.id));

      this.logger.log(`Incremental sync completed: ${updatedJobs.length} jobs`);
    } catch (error) {
      this.logger.error("Incremental sync failed", error);
    }
  }

  /**
   * Full sync chạy hàng ngày vào 2h sáng
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async dailyFullSync(): Promise<void> {
    this.logger.log("Starting daily full sync...");
    await this.syncAllActiveJobs();
  }
}

/**
 * Note: Cần implement các methods sau trong JobRepository:
 *
 * - findByIdWithRelations(id: string): Promise<Job>
 * - findByIdsWithRelations(ids: string[]): Promise<Job[]>
 * - findActiveJobs(filters: { limit: number; offset: number }): Promise<Job[]>
 * - findUpdatedSince(date: Date): Promise<Job[]>
 *
 * Hoặc có thể sử dụng các methods hiện có và transform data
 */
