import type {
  CandidateBriefAnalysis,
  CandidateBriefRecord,
} from "../../entities/candidate-brief.entity";

export abstract class ICandidateBriefRepository {
  abstract findActive(
    applicationId: string,
    organizationId: string,
  ): Promise<CandidateBriefRecord | null>;

  abstract save(
    applicationId: string,
    organizationId: string,
    createdBy: string,
    analysisResult: CandidateBriefAnalysis,
    inputFingerprint: string,
  ): Promise<CandidateBriefRecord>;

  abstract softDelete(
    applicationId: string,
    organizationId: string,
  ): Promise<boolean>;
}
