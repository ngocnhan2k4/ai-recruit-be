import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { User } from "../../core/entities";
import { IDataServices, IBloomFilterService } from "../../core/abstracts";
import { RESPONSE_CODE } from "@/common/constants/response";
import { ApiResponse } from "@/interfaces/dtos";

@Injectable()
export class UserUseCases implements OnModuleInit {
  private readonly logger = new Logger(UserUseCases.name);

  constructor(
    private readonly dataServices: IDataServices,
    public readonly bloomFilterService: IBloomFilterService,
  ) {}

  async onModuleInit() {
    // Check if bloom filter was loaded from Redis
    const lastUpdate = await this.bloomFilterService.getLastUpdateTime();

    if (!lastUpdate) {
      this.logger.log(
        "No Bloom filter found in Redis, building from database...",
      );
      await this.initializeBloomFilter();
    } else {
      this.logger.log(
        `Bloom filter loaded from Redis. Last updated: ${lastUpdate.toISOString()}`,
      );
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async refreshBloomFilterScheduled() {
    this.logger.log("Starting scheduled Bloom filter refresh...");
    await this.initializeBloomFilter();
    this.logger.log("Scheduled Bloom filter refresh completed");
  }

  private async initializeBloomFilter() {
    try {
      // Check if bloom filter is stale
      const isStale = await this.bloomFilterService.isStale(1); // 1 hour

      if (!isStale) {
        this.logger.log("Bloom filter is still fresh, skipping refresh");
        return;
      }

      // Get all usernames from database
      const users = await this.dataServices.users.getAll();
      const usernames = users.map((user) => user.username);

      // Initialize bloom filter with usernames and save to Redis
      await this.bloomFilterService.initialize(usernames);

      this.logger.log(
        `Bloom filter refreshed with ${usernames.length} usernames`,
      );
    } catch (error) {
      this.logger.error("Failed to initialize bloom filter:", error);
      throw error;
    }
  }

  async getAllUsers(): Promise<User[]> {
    return this.dataServices.users.getAll();
  }

  /**
   * Check if username exists using Bloom Filter (fast check)
   * Returns:
   * - false: Username definitely does NOT exist (100% accurate)
   * - true: Username MIGHT exist (needs database verification due to possible false positives)
   */
  async checkUserByUsername(
    username: string,
  ): Promise<ApiResponse<{ exists: boolean }>> {
    let exists = true;
    // Step 1: check bloom filter
    const mightExist = this.bloomFilterService.mightContain(username);

    if (!mightExist) {
      exists = false;
    }

    // Step 2: verify DB để loại false positive
    const user = await this.dataServices.users.getByField({ username });
    exists = user !== null;

    return {
      data: {
        exists,
      },
      message: "Username check result",
      code: RESPONSE_CODE.SUCCESS,
    };
  }
}
