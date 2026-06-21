import {
  Category,
  Job,
  OrganizationWithDetails,
  Province,
  Skill,
} from "@/core";
import { Environment } from "@/common/config";

export interface JobIndexConfig {
  env: Environment;
}

/**
 * Generate job index mapping with configurable settings
 * @param config - Configuration for index settings (shards, replicas)
 */
export function getJobIndexMapping({ env }: JobIndexConfig) {
  return {
    settings: {
      number_of_shards:
        env === Environment.Local || env === Environment.Development ? 1 : 1, // [TODO] Increase shards and replicas for production
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
        id: {
          type: "keyword",
        },
        title: {
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
        description: {
          type: "text",
          fields: {
            vietnamese: {
              type: "text",
              analyzer: "vietnamese_analyzer",
            },
          },
        },
        organizationId: {
          type: "keyword",
        },
        organizationName: {
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
        skillIds: {
          type: "keyword",
        },
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
        categoryId: {
          type: "keyword",
        },
        categoryName: {
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
        provinceIds: {
          type: "keyword",
        },
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
        salaryMin: { type: "scaled_float", scaling_factor: 100 },
        salaryMax: { type: "scaled_float", scaling_factor: 100 },
        experienceMin: {
          type: "integer",
        },
        experienceMax: {
          type: "integer",
        },
        recruitCount: {
          type: "integer",
        },
        workType: {
          type: "keyword",
        },
        status: {
          type: "keyword",
        },
        endDate: {
          type: "date",
        },
        datePosted: {
          type: "date",
        },
        questions: {
          type: "keyword",
        },
        createdAt: {
          type: "date",
        },
        embedding: {
          type: "dense_vector",
          dims: 1536,
          index: true,
          similarity: "cosine",
        },
        boost: {
          type: "rank_feature",
        },
      },
    },
  };
}

export function transformJobToDocument({
  job,
  skills,
  category,
  provinces,
  organization,
  embedding,
}: {
  job: Job;
  skills: Skill[];
  category: Category;
  provinces: Province[];
  organization: OrganizationWithDetails;
  embedding?: number[];
}): Record<string, unknown> {
  const salaryMin = job.salaryMin ? parseFloat(job.salaryMin) : null;
  const salaryMax = job.salaryMax ? parseFloat(job.salaryMax) : null;
  return {
    id: job.id,
    title: job.title,
    description: job.description || "",
    organizationId: job.organizationId,
    organizationName: organization?.name || null,
    skillIds: skills.map((s: Skill) => s.id).filter(Boolean),
    skillNames: skills.map((s: Skill) => s.name).filter(Boolean),
    categoryId: category.id,
    categoryName: category.name,
    provinceIds: provinces.map((p: Province) => p.id).filter(Boolean),
    provinceNames: provinces.map((p: Province) => p.name).filter(Boolean),
    salaryMin,
    salaryMax,
    experienceMin: job.experienceMin,
    experienceMax: job.experienceMax,
    recruitCount: job.recruitCount ?? null,
    workType: job.workType,
    questions: job.questions,
    status: job.status,
    endDate: job.endDate,
    datePosted: job.datePosted,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    embedding: embedding || null,
    boost: 1.0,
  };
}
