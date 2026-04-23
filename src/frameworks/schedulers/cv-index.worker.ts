import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { CV_INDEX_QUEUE } from "@/common/constants";
import { ISearchService } from "@/core/abstracts";
import { ICvRepository } from "@/core/abstracts";
import { transformCvToDocument } from "@/frameworks/data-services/elasticsearch/indices/cv.index";
import { CvService } from "@/services/cv/cv.service";
import { CvEventType } from "@/core";

type CvIndexData = {
  cvId: string;
};

@Processor(CV_INDEX_QUEUE, {
  concurrency: 2,
})
export class CvIndexWorker extends WorkerHost {
  private readonly logger = new Logger(CvIndexWorker.name);

  constructor(
    private readonly searchService: ISearchService,
    private readonly configService: ConfigService,
    private readonly cvRepository: ICvRepository,
    private readonly cvService: CvService,
  ) {
    super();
  }

  async process(job: Job) {
    try {
      await this.processEvent(job.name as CvEventType, job.data as CvIndexData);
    } catch (error: any) {
      this.logger.error(
        `[process] Failed to process cv ${job.id}: ${error}`,
        error.stack,
      );
      throw error;
    }
  }

  private async processEvent(
    type: CvEventType,
    data: CvIndexData,
  ): Promise<void> {
    const indexName = this.configService.get<string>(
      "ELASTICSEARCH_INDEX_JOBS",
    )!;

    switch (type) {
      case CvEventType.UPSERT_CV: {
        const cvId = data.cvId;
        if (cvId) {
          await this.processUpsert(data);
          this.logger.log(`[processEvent] Upserted cv ${cvId} to index`);
        } else {
          this.logger.warn("[processEvent] Upsert event missing cvId");
          throw new Error("[processEvent] Upsert event missing cvId");
        }
        return;
      }
      case CvEventType.DELETE_CV: {
        const cvId = data.cvId;
        if (cvId) {
          await this.searchService.deleteByQuery(indexName, {
            term: {
              id: data.cvId,
            },
          });
          this.logger.log(`[processEvent] Deleted cv ${cvId} from index`);
        } else {
          this.logger.warn("[processEvent] Delete event missing cvId");
          throw new Error("[processEvent] Delete event missing cvId");
        }
        return;
      }
    }
  }

  private async processUpsert(data: CvIndexData) {
    const indexName = this.configService.get<string>(
      "ELASTICSEARCH_INDEX_CVS",
    )!;

    const cv = await this.cvRepository.get(data.cvId);
    if (!cv) {
      this.logger.warn(`[extractAndIndex] CV not found: ${data.cvId}`);
      return;
    }

    const extractedData = await this.cvService.extractCv(cv);

    const document = transformCvToDocument({
      id: data.cvId,
      userId: cv.userId,
      name: extractedData.name,
      fileUrl: cv.fileUrl,
      mimeType: cv.mimeType,
      updatedAt: cv.updatedAt ?? null,
      skillIds: extractedData.skillIds || [],
      provinceIds: extractedData.provinceIds || [],
      categoryIds: extractedData.categoryIds || [],
      expectedSalary: extractedData.expectedSalary ?? undefined,
      experienceYears: extractedData.experienceYears ?? undefined,
      skillNames: extractedData.skillNames || [],
      provinceNames: extractedData.provinceNames || [],
      categoryNames: extractedData.categoryNames || [],
    });

    await this.searchService.indexDocument(indexName, cv.id, document);

    this.logger.log(
      `[extractAndIndex] Indexed CV ${cv.id} (userId=${cv.userId}) to ${indexName}`,
    );
  }
}
