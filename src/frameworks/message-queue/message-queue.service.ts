import { Injectable } from "@nestjs/common";
import { IMessageQueueService } from "@/core/abstracts/message-queue.abstract";
import {
  ACTIVITY_LOG_QUEUE,
  CV_INDEX_QUEUE,
  EMAIL_QUEUE,
  JOB_INDEX_QUEUE,
  SCORE_CV_QUEUE,
  TASK_QUEUE,
  TRANSLATION_QUEUE,
} from "@/common/constants";
import { JobsOptions, Queue, FlowProducer } from "bullmq";
import { InjectFlowProducer, InjectQueue } from "@nestjs/bullmq";
import { CvEventType } from "@/core";
import { TASK_EVENT } from "@/common/constants";
@Injectable()
export class MessageQueueService implements IMessageQueueService {
  constructor(
    @InjectQueue(JOB_INDEX_QUEUE) private readonly queueJob: Queue,
    @InjectQueue(TASK_QUEUE) private readonly queueTask: Queue,
    @InjectQueue(EMAIL_QUEUE) private readonly queueEmail: Queue,
    @InjectQueue(TRANSLATION_QUEUE) private readonly queueTranslation: Queue,
    @InjectQueue(CV_INDEX_QUEUE) private readonly queueCv: Queue,
    @InjectQueue(SCORE_CV_QUEUE) private readonly queueScoreCv: Queue,
    @InjectQueue(ACTIVITY_LOG_QUEUE) private readonly queueActivityLog: Queue,
    @InjectFlowProducer("cv_score_flow")
    private readonly flowProducer: FlowProducer,
  ) {}

  async addJob(name: string, data: any, opts?: any): Promise<void> {
    await this.queueJob.add(name, data, {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      ...opts,
    } as JobsOptions);
  }

  async addTask(name: string, data: any, opts?: any): Promise<void> {
    await this.queueTask.add(name, data, {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      ...opts,
    } as JobsOptions);
  }

  async addEmail(name: string, data: any, opts?: any): Promise<void> {
    await this.queueEmail.add(name, data, {
      removeOnComplete: true,
      removeOnFail: false,
      ...opts,
    } as JobsOptions);
  }

  async addTranslation(name: string, data: any, opts?: any): Promise<void> {
    await this.queueTranslation.add(name, data, {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      ...opts,
    } as JobsOptions);
  }

  async addCv(name: string, data: any, opts?: any): Promise<void> {
    await this.queueCv.add(name, data, {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      ...opts,
    } as JobsOptions);
  }

  async addScoreCv(name: string, data: any, opts?: any): Promise<void> {
    await this.queueScoreCv.add(name, data, {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      ...opts,
    } as JobsOptions);
  }

  async addCvThenScore(
    cvData: { cvId: string },
    scoreData: { applyId: string; jobId: string; cvId: string },
  ): Promise<void> {
    await this.flowProducer.add({
      name: TASK_EVENT.SCORE_CV_APPLY,
      queueName: SCORE_CV_QUEUE,
      data: scoreData,
      opts: {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
      },
      children: [
        {
          name: CvEventType.UPSERT_CV,
          queueName: CV_INDEX_QUEUE,
          data: cvData,
          opts: {
            removeOnComplete: true,
            removeOnFail: false,
            attempts: 3,
            backoff: { type: "exponential", delay: 5000 },
          },
        },
      ],
    });
  }

  async addActivityLog(name: string, data: any, opts?: any): Promise<void> {
    await this.queueActivityLog.add(name, data, {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      ...opts,
    } as JobsOptions);
  }
}
