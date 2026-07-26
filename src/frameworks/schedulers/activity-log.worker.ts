import { Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { ACTIVITY_LOG_QUEUE } from "@/common/constants";
import { IActivityRepository } from "@/core/abstracts/repositories/activity-repository.abstract";
import type { Activity } from "@/core/entities/activity";

@Processor(ACTIVITY_LOG_QUEUE, {
  concurrency: 2,
})
export class ActivityLogWorker extends WorkerHost {
  private readonly logger = new Logger(ActivityLogWorker.name);

  constructor(private readonly activityRepository: IActivityRepository) {
    super();
  }

  async process(job: Job) {
    try {
      await this.processEvent(job.data as Activity);
    } catch (error: any) {
      this.logger.error(
        `[process] Failed to process activity log ${job.id}: ${error}`,
        error.stack,
      );
      throw error;
    }
  }

  private async processEvent(data: Activity): Promise<void> {
    if (!data?.action) {
      this.logger.warn("Skipping activity log without action");
      return;
    }

    if (!data.createdBy) {
      this.logger.warn(
        `Skipping activity log without createdBy action=${data.action}`,
      );
      return;
    }

    await this.activityRepository.create({
      id: data.id,
      createdBy: data.createdBy,
      organizationId: data.organizationId ?? null,
      action: data.action,
      metadata: data.metadata ?? {},
      targetId: data.targetId ?? null,
      targetType: data.targetType,
      visibility: data.visibility,
      createdAt:
        data.createdAt instanceof Date
          ? data.createdAt
          : new Date(data.createdAt ?? Date.now()),
    });

    this.logger.debug(`Persisted activity ${data.id} action=${data.action}`);
  }
}
