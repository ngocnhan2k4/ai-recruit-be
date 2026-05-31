import { Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { ACTIVITY_LOG_QUEUE } from "@/common/constants";

@Processor(ACTIVITY_LOG_QUEUE, {
  concurrency: 2,
})
export class ActivityLogWorker extends WorkerHost {
  private readonly logger = new Logger(ActivityLogWorker.name);

  constructor() {
    super();
  }

  async process(job: Job) {
    try {
      await this.processEvent(job.data);
    } catch (error: any) {
      this.logger.error(
        `[process] Failed to process activity log ${job.id}: ${error}`,
        error.stack,
      );
      throw error;
    }
  }

  private async processEvent(data: any): Promise<void> {
    console.log("Processing activity log:", data);
    return Promise.resolve();
  }
}
