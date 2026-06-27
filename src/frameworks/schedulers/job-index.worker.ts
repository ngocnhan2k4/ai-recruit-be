import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IJobRepository, ISearchService, IAIService } from "@/core/abstracts";
import { transformJobToDocument } from "@/frameworks/data-services/elasticsearch/indices/job.index";
import { JOB_INDEX_QUEUE } from "@/common/constants";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { JobEventType, JobStatusEnum } from "@/core";

type JobIndexData = {
  jobId: string;
  organizationId: string;
  organizationName: string;
};

@Processor(JOB_INDEX_QUEUE, {
  concurrency: 2,
})
export class JobIndexWorker extends WorkerHost {
  private readonly logger = new Logger(JobIndexWorker.name);

  constructor(
    private readonly searchService: ISearchService,
    private readonly configService: ConfigService,
    private readonly jobRepository: IJobRepository,
    private readonly aiService: IAIService,
  ) {
    super();
  }

  async process(job: Job) {
    try {
      await this.processEvent(
        job.name as JobEventType,
        job.data as JobIndexData,
      );
    } catch (error: any) {
      this.logger.error(
        `[worker.job-index.process] Failed to process job ${job.id}: ${error}`,
        error.stack,
      );
      // await this.loggerService.logError({
      //   type: "error",
      //   content: `[process] Failed to process job ${job.id}: ${error}`,
      //   note: error.stack,
      // });
      throw error;
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
      case JobEventType.DELETE_JOB: {
        const jobId = data.jobId;
        if (jobId) {
          await this.searchService.deleteByQuery(indexName, {
            term: {
              id: jobId,
            },
          });
          this.logger.log(`[processEvent] Deleted job ${jobId} from index`);
        } else {
          this.logger.warn("[processEvent] Delete event missing jobId");
          throw new Error("[processEvent] Delete event missing jobId");
        }
        return;
      }
      case JobEventType.UPSERT_JOB: {
        const job = await this.jobRepository.getFullJobById(data.jobId);
        if (!job) {
          this.logger.warn(`[processEvent] Job ${data.jobId} not found`);
          throw new Error(`[processEvent] Job ${data.jobId} not found`);
        }

        let embedding = (job.job as any).embedding as number[] | undefined;

        if (job.job.status === (JobStatusEnum.ACTIVE as string)) {
          try {
            const textToEmbed = `${job.job.title} ${job.job.description || ""} ${job.skills.map((s: any) => s.name).join(" ")} ${job.category.name || ""}`;
            embedding = await this.aiService.generateEmbedding(textToEmbed);

            // Save the new embedding back to the database
            await this.jobRepository.updateJob(job.job.id, { embedding });
          } catch (e: any) {
            this.logger.warn(
              `[processEvent] Failed to generate embedding for job ${data.jobId}: ${e.message}`,
            );
          }
        }

        const document = transformJobToDocument({
          ...job,
          embedding,
        });

        const res = await this.searchService.indexDocument(
          indexName,
          job.job.id,
          document,
        );
        this.logger.log(
          `[processEvent] Indexed job ${job.job.id} with data ${JSON.stringify(document)} and response ${JSON.stringify(res)}`,
        );
        return;
      }
      case JobEventType.UPDATE_ORG: {
        await this.searchService.updateByQuery(
          indexName,
          {
            term: {
              organizationId: data.organizationId,
            },
          },
          {
            source: "ctx._source.organizationName = params.name",
            params: {
              name: data.organizationName,
            },
          },
        );
        this.logger.log(
          `[processEvent] update job of org ${data.organizationId}`,
        );
        return;
      }
      case JobEventType.DELETE_ORG: {
        await this.searchService.deleteByQuery(indexName, {
          term: {
            organizationId: data.organizationId,
          },
        });
        this.logger.log(
          `[processEvent] delete job of org ${data.organizationId}`,
        );
      }
    }
  }
}
