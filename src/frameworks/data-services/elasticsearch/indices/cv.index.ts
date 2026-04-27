import { Environment } from "@/common/config";
import { ExperienceLevelEnum } from "@/core/entities/enum.entity";

export interface CvIndexConfig {
  env: Environment;
}

export function getCvIndexMapping({ env }: CvIndexConfig) {
  return {
    settings: {
      number_of_shards:
        env === Environment.Local || env === Environment.Development ? 1 : 1,
      number_of_replicas:
        env === Environment.Local || env === Environment.Development ? 0 : 0,
      analysis: {
        analyzer: {
          vietnamese_analyzer: {
            type: "custom",
            tokenizer: "icu_tokenizer",
            filter: ["lowercase"],
          },
        },
      },
    },
    mappings: {
      properties: {
        id: { type: "keyword" },
        userId: { type: "keyword" },
        aiCvId: { type: "keyword" },
        name: { type: "text", fields: { keyword: { type: "keyword" } } },
        fileUrl: { type: "keyword" },
        mimeType: { type: "keyword" },

        // Candidate profile facets (phase 1 filter)
        skillIds: { type: "keyword" },
        skillNames: {
          type: "text",
          fields: {
            keyword: {
              type: "keyword",
            },
            vietnamese: {
              type: "text",
              analyzer: "vietnamese_analyzer",
            },
          },
        },
        provinceIds: { type: "keyword" },
        provinceNames: {
          type: "text",
          fields: {
            keyword: {
              type: "keyword",
            },
            vietnamese: {
              type: "text",
              analyzer: "vietnamese_analyzer",
            },
          },
        },
        categoryIds: { type: "keyword" },
        categoryNames: {
          type: "text",
          fields: {
            keyword: {
              type: "keyword",
            },
            vietnamese: {
              type: "text",
              analyzer: "vietnamese_analyzer",
            },
          },
        },
        expectedSalary: { type: "scaled_float", scaling_factor: 100 },
        experienceYears: { type: "integer" },

        extractedAt: { type: "date" },
        indexedAt: { type: "date" },
        updatedAt: { type: "date" },
      },
    },
  };
}

export function transformCvToDocument(params: {
  id: string;
  userId: string;
  aiCvId: string | null;
  name: string;
  fileUrl: string;
  mimeType: string;
  updatedAt?: Date | string | null;
  skillIds?: string[];
  provinceIds?: string[];
  categoryIds?: string[];
  expectedSalary?: number;
  experienceYears?: number;
  skillNames?: string[];
  provinceNames?: string[];
  categoryNames?: string[];
  experienceLevel?: ExperienceLevelEnum;
}): Record<string, unknown> {
  return {
    id: params.id,
    userId: params.userId,
    aiCvId: params.aiCvId,
    name: params.name,
    fileUrl: params.fileUrl,
    mimeType: params.mimeType,
    skillIds: params.skillIds || [],
    skillNames: params.skillNames || [],
    provinceIds: params.provinceIds || [],
    provinceNames: params.provinceNames || [],
    categoryIds: params.categoryIds || [],
    categoryNames: params.categoryNames || [],
    expectedSalary: params.expectedSalary || null,
    experienceYears: params.experienceYears || null,
    experienceLevel: params.experienceLevel || null,
    updatedAt: params.updatedAt
      ? new Date(params.updatedAt).toISOString()
      : null,
  };
}
