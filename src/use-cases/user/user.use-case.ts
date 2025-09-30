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
    await this.initializeBloomFilter();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async refreshBloomFilterScheduled() {
    this.logger.log(
      "[UserUseCases] [refreshBloomFilterScheduled] Starting scheduled Bloom filter refresh...",
    );
    await this.initializeBloomFilter();
  }

  private async initializeBloomFilter() {
    try {
      // Get all usernames from database
      const users = await this.dataServices.users.getAll();
      const usernames = users.map((user) => user.username);

      this.bloomFilterService.initialize(usernames);

      this.logger.log(
        `[UserUseCases] [initializeBloomFilter] Bloom filter refreshed with ${usernames.length} usernames`,
      );
    } catch (error) {
      this.logger.error(
        "[UserUseCases] [initializeBloomFilter] Failed to initialize bloom filter:",
        error,
      );
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
