import { Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { SCORE_CV_QUEUE } from "@/common/constants";
import {
  IJobRepository,
  ICvSearchService,
  IJobSearchService,
  ICvService,
} from "@/core/abstracts";
import {
  formatWorkerErrorLog,
  runJobWithContext,
} from "@/common/utils/job-context";

type ScoreCvApplyData = {
  applyId: string;
  jobId: string;
  cvId: string;
};

@Processor(SCORE_CV_QUEUE, {
  concurrency: 2,
})
export class ScoreCvWorker extends WorkerHost {
  private readonly logger = new Logger(ScoreCvWorker.name);

  constructor(
    private readonly jobRepository: IJobRepository,
    private readonly cvSearchService: ICvSearchService,
    private readonly jobSearchService: IJobSearchService,
    private readonly cvService: ICvService,
  ) {
    super();
  }

  async process(job: Job) {
    return runJobWithContext(job, async () => {
      try {
        return await this.processCvScoring(job.data as ScoreCvApplyData);
      } catch (error) {
        this.logger.error(formatWorkerErrorLog("score-cv.worker", job, error));
        throw error;
      }
    });
  }

  private async processCvScoring(data: ScoreCvApplyData): Promise<void> {
    const { applyId, jobId, cvId } = data;
    this.logger.log(`[processCvScoring] start applyId=${applyId}`);

    const [cvResult, jobResult] = await Promise.all([
      this.cvSearchService.getCvById(cvId),
      this.jobSearchService.getJobById(jobId),
    ]);

    if (!cvResult) {
      throw new Error(`CV ${cvId} not indexed in ES after 15s`);
    }
    if (!jobResult) {
      throw new Error(`Job ${jobId} not found in ES`);
    }

    const { score, criteria } = this.cvService.calculateMatchingScore(
      cvResult,
      jobResult,
    );

    await this.jobRepository.updateMatchingScore(applyId, score, criteria);

    this.logger.log(
      `[processCvScoring] done applyId=${applyId} score=${score === null ? "null" : score.toFixed(2)}`,
    );
  }
}
