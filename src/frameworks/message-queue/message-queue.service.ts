import { Injectable } from "@nestjs/common";
import { IMessageQueueService } from "@/core/abstracts/message-queue.abstract";
import { IRedisService } from "@/core";

@Injectable()
export class MessageQueueService implements IMessageQueueService {
  private readonly defaultQueueKey = "message:queue";

  constructor(private readonly redisService: IRedisService) {}

  private getQueueKey(queueKey?: string): string {
    return queueKey ?? this.defaultQueueKey;
  }

  async add(item: string, queueKey?: string): Promise<void> {
    await this.redisService.addToSortedSet(
      this.getQueueKey(queueKey),
      Date.now(),
      item,
    );
  }

  async size(queueKey?: string): Promise<number> {
    return this.redisService.getSortedSetSize(this.getQueueKey(queueKey));
  }
  async clear(queueKey?: string): Promise<void> {
    await this.redisService.deleteMultipleKeys([this.getQueueKey(queueKey)]);
  }

  async popBatch(queueKey?: string, batchSize = 10): Promise<string[]> {
    return this.redisService.popMinFromSortedSet(
      this.getQueueKey(queueKey),
      batchSize,
    );
  }
}
