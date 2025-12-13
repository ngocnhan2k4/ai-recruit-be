import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ConfigService } from "@nestjs/config";
import { IMessageQueueService } from "@/core/abstracts/message-queue.abstract";
import { ILoggerServices, ISearchService } from "@/core/abstracts";
import { transformJobToDocument } from "@/frameworks/data-services/elasticsearch/indices/job.index";
import { JOB_INDEX_QUEUE } from "@/common/constants/queue";
import { JobResponse } from "@/core/entities/job.entity";

type JobIndexEvent =
  | { type: "upsert"; data: JobResponse }
  | { type: "delete"; data: { jobId: string } };

@Injectable()
export class JobIndexWorker {
  private readonly logger = new Logger(JobIndexWorker.name);
  private isProcessing = false;

  constructor(
    private readonly messageQueueService: IMessageQueueService,
    private readonly searchService: ISearchService,
    private readonly configService: ConfigService,
    private readonly loggerService: ILoggerServices,
  ) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    const rawEvent = await this.messageQueueService.getNext(JOB_INDEX_QUEUE);
    if (!rawEvent) {
      return;
    }

    this.isProcessing = true;
    try {
      const event = JSON.parse(rawEvent) as JobIndexEvent;
      await this.processEvent(event);
      await this.messageQueueService.remove(rawEvent, JOB_INDEX_QUEUE);
    } catch (error) {
      this.logger.error(
        `[processQueue] Failed to process event ${rawEvent}: ${error.message}`,
        error.stack,
      );
      await this.loggerService.logError({
        type: "error",
        content: `[processQueue] Failed to process event ${rawEvent}: ${error.message}`,
        note: error.stack,
      });
      // Drop the event to avoid blocking
      await this.messageQueueService.remove(rawEvent, JOB_INDEX_QUEUE);
    } finally {
      this.isProcessing = false;
    }
  }

  // [TODO]: handle batch processing to improve performance
  private async processEvent(event: JobIndexEvent): Promise<void> {
    const indexName = this.configService.get<string>(
      "ELASTICSEARCH_INDEX_JOBS",
    )!;

    switch (event.type) {
      case "delete": {
        const jobId = event.data.jobId;
        if (jobId) {
          await this.searchService.deleteDocument(indexName, jobId);
          this.logger.log(`[processEvent] Deleted job ${jobId} from index`);
        } else {
          this.logger.warn("[processEvent] Delete event missing jobId");
        }
        return;
      }
      case "upsert": {
        const document = transformJobToDocument({
          job: event.data.job,
          skills: event.data.skills || [],
          category: event.data.category,
          provinces: event.data.provinces || [],
          organization: event.data.organization,
        });

        await this.searchService.indexDocument(
          indexName,
          event.data.job.id,
          document,
        );
        this.logger.log(`[processEvent] Indexed job ${event.data.job.id}`);
        return;
      }
    }
  }
}
