import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  IJobRepository,
  ILoggerServices,
  ISearchService,
} from "@/core/abstracts";
import { transformJobToDocument } from "@/frameworks/data-services/elasticsearch/indices/job.index";
import { JOB_INDEX_QUEUE } from "@/common/constants";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { JobEventType } from "@/core";

type JobIndexData = { jobId: string };

@Processor(JOB_INDEX_QUEUE)
export class JobIndexWorker extends WorkerHost {
  private readonly logger = new Logger(JobIndexWorker.name);

  constructor(
    private readonly searchService: ISearchService,
    private readonly configService: ConfigService,
    private readonly loggerService: ILoggerServices,
    private readonly jobRepository: IJobRepository,
  ) {
    super();
  }

  async process(job: Job) {
    try {
      await this.processEvent(
        job.name as JobEventType,
        job.data as JobIndexData,
      );
    } catch (error) {
      this.logger.error(
        `[process] Failed to process job ${job.id}: ${error}`,
        error.stack,
      );
      await this.loggerService.logError({
        type: "error",
        content: `[process] Failed to process job ${job.id}: ${error}`,
        note: error.stack,
      });
    }
  }

  private async processEvent(
    type: JobEventType,
    data: JobIndexData,
  ): Promise<void> {
    const indexName = this.configService.get<string>(
      "ELASTICSEARCH_INDEX_JOBS",
    )!;

    switch (type) {
      case JobEventType.DELETE: {
        const jobId = data.jobId;
        if (jobId) {
          await this.searchService.deleteDocument(indexName, jobId);
          this.logger.log(`[processEvent] Deleted job ${jobId} from index`);
        } else {
          this.logger.warn("[processEvent] Delete event missing jobId");
          throw new Error("[processEvent] Delete event missing jobId");
        }
        return;
      }
      case JobEventType.UPSERT: {
        const job = await this.jobRepository.getFullJobById(data.jobId);
        if (!job) {
          this.logger.warn(`[processEvent] Job ${data.jobId} not found`);
          throw new Error(`[processEvent] Job ${data.jobId} not found`);
        }
        const document = transformJobToDocument(job);

        await this.searchService.indexDocument(indexName, job.job.id, document);
        this.logger.log(`[processEvent] Indexed job ${job.job.id}`);
        return;
      }
    }
  }
}
