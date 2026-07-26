import { Injectable, Logger } from "@nestjs/common";
import {
  CreateTrackingEventRequestDto,
  EventTypeEnum,
} from "../../interfaces/dtos/event-tracking/event-tracking.dto";
import { RedisService } from "@/frameworks/redis/redis.service";
import { ConfigService } from "@nestjs/config";
import { ISearchService } from "@/core/abstracts";
import { Environment } from "@/common/config";
import { getEventTrackingIndexMapping } from "@/frameworks/data-services/elasticsearch/indices/event-tracking.index";
import { ObjectType } from "@/core";

export interface UserPreferenceProfile {
  lastCategories?: string[];
  lastProvinces?: string[];
  lastSalaryMin?: number;
}

interface TrackedJobInteraction {
  jobId: string;
  eventType: EventTypeEnum;
}

interface UserTrackingDocument {
  id: string;
  recentJobs: TrackedJobInteraction[];
  preferences?: UserPreferenceProfile | null;
  updatedAt: string;
}

const RECENT_JOB_LIMIT = 50;
const RECENT_JOB_FETCH_LIMIT = 12;
const TRACKING_TTL_SECONDS = 7 * 24 * 60 * 60;

@Injectable()
export class EventTrackingService {
  private readonly logger = new Logger(EventTrackingService.name);
  private ensureIndexPromise?: Promise<void>;

  constructor(
    private readonly redisService: RedisService,
    private readonly searchService: ISearchService,
    private readonly configService: ConfigService,
  ) {}

  async trackEvent(
    dto: CreateTrackingEventRequestDto & { userId?: string },
  ): Promise<void> {
    const userId = dto.userId;
    if (!userId) return;

    if (dto.objectType === ObjectType.JOB) {
      await this.trackJobInteraction(dto);
    }

    if (
      dto.eventType === EventTypeEnum.FILTER_JOB ||
      dto.eventType === EventTypeEnum.SEARCH_JOB
    ) {
      await this.updateUserPreference(userId, dto.metadata);
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
    await this.redisService.expire(key, TRACKING_TTL_SECONDS); // 7 days

    await this.syncTrackingDocument(dto.userId as string);
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

    await this.redisService.setJson(
      key,
      currentPref,
      TRACKING_TTL_SECONDS * 1000,
    ); // 7 days

    await this.syncTrackingDocument(userId);
  }

  async getUserPreference(
    userId: string,
  ): Promise<UserPreferenceProfile | null> {
    const key = `user:${userId}:preferences`;
    const cached = await this.redisService.getJson<UserPreferenceProfile>(key);
    if (cached) return cached;

    const doc = await this.getTrackingDocumentFromEs(userId);
    const preference = doc?.preferences ?? null;
    if (preference) {
      await this.redisService.setJson(
        key,
        preference,
        TRACKING_TTL_SECONDS * 1000,
      );
    }

    return preference;
  }

  async getUserRecentInteractedJobs(
    userId: string,
  ): Promise<TrackedJobInteraction[]> {
    const key = `user:${userId}:recent_jobs`;
    // get top 12 most recent (highest score)
    let recent = await this.redisService.getSortedSetRange(
      key,
      -RECENT_JOB_FETCH_LIMIT,
      -1,
    );

    if (recent.length === 0) {
      const loaded = await this.loadRecentJobsFromEsToRedis(userId);
      if (loaded) {
        recent = await this.redisService.getSortedSetRange(
          key,
          -RECENT_JOB_FETCH_LIMIT,
          -1,
        );
      }
    }

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
    const indexName = this.indexName();

    await this.redisService.del(prefKey);
    await this.redisService.del(recentKey);
    await this.redisService.del(bloomKey);

    if (await this.searchService.existsIndex(indexName)) {
      await this.searchService.deleteByQuery(indexName, {
        term: { id: userId },
      });
    }
  }

  private indexName(): string {
    return (
      this.configService.get<string>("ELASTICSEARCH_INDEX_EVENT_TRACKING") ||
      "event-tracking"
    );
  }

  private async ensureIndex(): Promise<void> {
    if (!this.ensureIndexPromise) {
      this.ensureIndexPromise = (async () => {
        const indexName = this.indexName();
        const exists = await this.searchService.existsIndex(indexName);
        if (!exists) {
          await this.searchService.createIndex(
            indexName,
            getEventTrackingIndexMapping({
              env: this.configService.get<Environment>("NODE_ENV")!,
            }),
          );
          this.logger.log(`Created index: ${indexName}`);
        }
      })().catch((error) => {
        this.ensureIndexPromise = undefined;
        throw error;
      });
    }

    await this.ensureIndexPromise;
  }

  private async getTrackingDocumentFromEs(
    userId: string,
  ): Promise<UserTrackingDocument | null> {
    await this.ensureIndex();

    const response = await this.searchService.search(this.indexName(), {
      query: { term: { id: userId } },
      size: 1,
    });

    const source = response?.hits?.hits?.[0]?._source;
    if (!source?.id) return null;

    return source as UserTrackingDocument;
  }

  private async loadRecentJobsFromEsToRedis(userId: string): Promise<boolean> {
    const doc = await this.getTrackingDocumentFromEs(userId);
    if (!doc?.recentJobs?.length) return false;

    const key = `user:${userId}:recent_jobs`;
    await this.redisService.del(key);

    const recentJobs = doc.recentJobs.slice(0, RECENT_JOB_LIMIT);
    const baseScore = Date.now();

    for (let index = 0; index < recentJobs.length; index += 1) {
      const item = recentJobs[index];
      const member = `${item.jobId}:${item.eventType}`;
      await this.redisService.addToSortedSet(
        key,
        baseScore + (recentJobs.length - index),
        member,
      );
    }

    await this.redisService.expire(key, TRACKING_TTL_SECONDS);
    return true;
  }

  private async syncTrackingDocument(userId: string): Promise<void> {
    await this.ensureIndex();

    const [recentJobs, preferences] = await Promise.all([
      this.getUserRecentInteractedJobs(userId),
      this.getUserPreference(userId),
    ]);

    if (recentJobs.length === 0 && !preferences) {
      return;
    }

    const document: UserTrackingDocument = {
      id: userId,
      recentJobs: recentJobs.slice(0, RECENT_JOB_LIMIT),
      preferences,
      updatedAt: new Date().toISOString(),
    };

    await this.searchService.indexDocument(this.indexName(), userId, document);
  }
}
