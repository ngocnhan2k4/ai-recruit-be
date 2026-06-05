import { Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { PAYMENT_QUEUE } from "@/common/constants";
import {
  IUserSubscriptionRepository,
  PaymentEventMessage,
  TransactionStatus,
  UserSubscriptionStatusEnum,
} from "@/core";

@Processor(PAYMENT_QUEUE, {
  concurrency: 1,
})
export class PaymentWorker extends WorkerHost {
  private readonly logger = new Logger(PaymentWorker.name);

  constructor(
    private readonly userSubscriptionRepository: IUserSubscriptionRepository,
  ) {
    super();
  }

  async process(job: Job) {
    return this.processPayment(job.name, job.data);
  }

  private async processPayment(
    eventType: string,
    data: PaymentEventMessage,
  ): Promise<void> {
    this.logger.log(
      `Processing payment event of type ${eventType} with data: ${JSON.stringify(
        data,
      )}`,
    );
    if (data.status !== TransactionStatus.Paid) {
      this.logger.warn(
        `Skipping processing for transaction ${data.orderCode} with status ${data.status}`,
      );
      return;
    }

    const userSubscription = await this.userSubscriptionRepository.get(
      data.orderCode,
    );
    if (!userSubscription) {
      this.logger.error(
        `User subscription not found for order code ${data.orderCode}`,
      );
      return;
    }
    if (
      userSubscription.status !==
      UserSubscriptionStatusEnum.PENDING_ACTIVATION.toString()
    ) {
      this.logger.warn(
        `User subscription for order code ${data.orderCode} is not in pending activation status, current status: ${userSubscription.status}`,
      );
      return;
    }

    await this.userSubscriptionRepository.updateUserSubscription(
      data.orderCode,
      {
        userId: data.userId,
        status: UserSubscriptionStatusEnum.ACTIVE,
      },
    );
  }
}
