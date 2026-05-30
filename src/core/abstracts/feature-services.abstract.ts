import { FeatureCodeEnum } from "../entities";

export abstract class IFeatureService {
  abstract consumeFeature(
    userId: string,
    featureCode: FeatureCodeEnum,
    amount?: number,
  ): Promise<void>;

  abstract releaseFeature(
    userId: string,
    featureCode: FeatureCodeEnum,
    amount?: number,
  ): Promise<void>;
}
