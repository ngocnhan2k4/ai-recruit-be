import { Injectable, Logger } from "@nestjs/common";
import {
  CreateTrackingEventRequestDto,
  EventTypeEnum,
  ObjectTypeEnum,
} from "../../interfaces/dtos/event-tracking/event-tracking.dto";
import { RedisService } from "@/frameworks/redis/redis.service";

export interface UserPreferenceProfile {
  lastCategories?: string[];
  lastProvinces?: string[];
  lastSalaryMin?: number;
}

@Injectable()
export class EventTrackingService {
  private readonly logger = new Logger(EventTrackingService.name);

  constructor(private readonly redisService: RedisService) {}

  async trackEvent(
    dto: CreateTrackingEventRequestDto & { userId?: string },
  ): Promise<void> {
    if (!dto.userId) return;

    if (dto.objectType === ObjectTypeEnum.JOB) {
      await this.trackJobInteraction(dto);
    }

    if (
      dto.eventType === EventTypeEnum.FILTER_JOB ||
      dto.eventType === EventTypeEnum.SEARCH_JOB
    ) {
      await this.updateUserPreference(dto.userId, dto.metadata);
    }
  }

  private async trackJobInteraction(
    dto: CreateTrackingEventRequestDto & { userId?: string },
  ): Promise<void> {
    const key = `user:${dto.userId}:recent_jobs`;
    const score = Date.now();
    // Save job ID and event type, like "jobId:eventType"
    const member = `${dto.objectId}:${dto.eventType}`;
    await this.redisService.addToSortedSet(key, score, member);
    // Keep only the top 50 recent jobs to prevent unbounded growth
    // Rank 0 is the lowest score (oldest). We keep the highest scores.
    await this.redisService.removeSortedSetRangeByRank(key, 0, -51);
    await this.redisService.expire(key, 7 * 24 * 60 * 60); // 7 days
  }

  private async updateUserPreference(
    userId: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    if (!metadata) return;
    const key = `user:${userId}:preferences`;

    const currentPref = (await this.getUserPreference(userId)) || {};

    if (metadata.categoryId) {
      const newCats = Array.isArray(metadata.categoryId)
        ? metadata.categoryId
        : [metadata.categoryId as string];
      const existingCats = currentPref.lastCategories || [];
      currentPref.lastCategories = [
        ...new Set([...newCats, ...existingCats]),
      ].slice(0, 5);
    }
    if (metadata.provinceId) {
      const newProvinces = Array.isArray(metadata.provinceId)
        ? metadata.provinceId
        : [metadata.provinceId as string];
      const existingProvinces = currentPref.lastProvinces || [];
      currentPref.lastProvinces = [
        ...new Set([...newProvinces, ...existingProvinces]),
      ].slice(0, 5);
    }
    if (metadata.salaryMin) {
      currentPref.lastSalaryMin = Number(metadata.salaryMin);
    }

    await this.redisService.setJson(key, currentPref, 7 * 24 * 60 * 60 * 1000); // 7 days
  }

  async getUserPreference(
    userId: string,
  ): Promise<UserPreferenceProfile | null> {
    return this.redisService.getJson<UserPreferenceProfile>(
      `user:${userId}:preferences`,
    );
  }

  async getUserRecentInteractedJobs(
    userId: string,
  ): Promise<{ jobId: string; eventType: EventTypeEnum }[]> {
    const key = `user:${userId}:recent_jobs`;
    // get top 12 most recent (highest score)
    const recent = await this.redisService.getSortedSetRange(key, -12, -1);
    return recent.reverse().map((member) => {
      const [jobId, ...rest] = member.split(":");
      return {
        jobId,
        eventType: rest.join(":") as EventTypeEnum,
      };
    });
  }

  async clearUserData(userId: string): Promise<void> {
    const prefKey = `user:${userId}:preferences`;
    const recentKey = `user:${userId}:recent_jobs`;
    const bloomKey = `user_seen_jobs:${userId}`;

    await this.redisService.del(prefKey);
    await this.redisService.del(recentKey);
    await this.redisService.del(bloomKey);
  }
}
