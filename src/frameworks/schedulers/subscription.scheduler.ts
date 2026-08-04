import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { SubscriptionUseCases } from "@/use-cases/subscription/subscription.use-case";

@Injectable()
export class SubscriptionScheduler {
  private readonly logger = new Logger(SubscriptionScheduler.name);

  constructor(private readonly subscriptionUsecase: SubscriptionUseCases) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async scheduleCancelExpiredSubscriptions(): Promise<void> {
    try {
      this.logger.log(
        "Running scheduled cancel expired subscriptions cron job...",
      );
      await this.subscriptionUsecase.cancelUserSubscription();
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to cancel expired subscriptions: ${err.message}`,
        err.stack,
      );
    }
  }
}
