import { Injectable } from "@nestjs/common";
import { IMessageQueueService } from "@/core/abstracts/message-queue.abstract";
import { JOB_INDEX_QUEUE } from "@/common/constants";
import { JobsOptions, Queue } from "bullmq";
import { InjectQueue } from "@nestjs/bullmq";
@Injectable()
export class MessageQueueService implements IMessageQueueService {
  constructor(@InjectQueue(JOB_INDEX_QUEUE) private readonly queue: Queue) {}

  async addJob(name: string, data: any, opts?: any): Promise<void> {
    await this.queue.add(name, data, {
      removeOnComplete: true,
      removeOnFail: true,
      ...opts,
    } as JobsOptions);
  }
}
