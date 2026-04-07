import { Injectable } from "@nestjs/common";
import { IMessageQueueService } from "@/core/abstracts/message-queue.abstract";
import { EMAIL_QUEUE, JOB_INDEX_QUEUE, TASK_QUEUE } from "@/common/constants";
import { JobsOptions, Queue } from "bullmq";
import { InjectQueue } from "@nestjs/bullmq";
@Injectable()
export class MessageQueueService implements IMessageQueueService {
  constructor(
    @InjectQueue(JOB_INDEX_QUEUE) private readonly queueJob: Queue,
    @InjectQueue(TASK_QUEUE) private readonly queueTask: Queue,
    @InjectQueue(EMAIL_QUEUE) private readonly queueEmail: Queue,
  ) {}

  async addJob(name: string, data: any, opts?: any): Promise<void> {
    await this.queueJob.add(name, data, {
      removeOnComplete: true,
      removeOnFail: true,
      ...opts,
    } as JobsOptions);
  }

  async addTask(name: string, data: any, opts?: any): Promise<void> {
    await this.queueTask.add(name, data, {
      removeOnComplete: true,
      removeOnFail: false,
      ...opts,
    } as JobsOptions);
  }

  async addEmail(name: string, data: any, opts?: any): Promise<void> {
    await this.queueEmail.add(name, data, {
      removeOnComplete: true,
      removeOnFail: false,
      ...opts,
    } as JobsOptions);
  }
}
