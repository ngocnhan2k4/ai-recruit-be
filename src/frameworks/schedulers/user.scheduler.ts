import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { UserUseCases } from "@/use-cases/user/user.use-case";

@Injectable()
export class UserScheduler {
  private readonly logger = new Logger(UserScheduler.name);

  constructor(private readonly userUseCases: UserUseCases) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanUpPendingDeletionUsers(): Promise<void> {
    this.logger.log(
      "Running scheduled user clean up pending deletion users cron job...",
    );
    await this.userUseCases.cleanUpPendingDeletionAccounts();
  }
}
