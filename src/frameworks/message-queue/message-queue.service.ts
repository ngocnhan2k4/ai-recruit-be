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

  async remove(item: string, queueKey?: string): Promise<void> {
    await this.redisService.removeFromSortedSet(
      this.getQueueKey(queueKey),
      item,
    );
  }

  async getNext(queueKey?: string): Promise<string | null> {
    const key = this.getQueueKey(queueKey);
    const [next] = await this.redisService.getRangeBySortedSetScore(
      key,
      Number.NEGATIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      1,
    );
    return next ?? null;
  }

  async size(queueKey?: string): Promise<number> {
    return this.redisService.getSortedSetSize(this.getQueueKey(queueKey));
  }
  async clear(queueKey?: string): Promise<void> {
    await this.redisService.deleteMultipleKeys([this.getQueueKey(queueKey)]);
  }
}
