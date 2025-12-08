/**
 * Example: Job Index Mapping Definition
 *
 * File location: src/frameworks/data-services/elasticsearch/indices/job.index.ts
 */

export const JOB_INDEX_NAME = "jobs";

export const jobIndexMapping = {
  settings: {
    number_of_shards: 3,
    number_of_replicas: 1,
    analysis: {
      analyzer: {
        vietnamese_analyzer: {
          type: "standard",
          // Có thể tích hợp Vietnamese tokenizer sau
          // Ví dụ: https://github.com/duydo/elasticsearch-analysis-vietnamese
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
        analyzer: "vietnamese_analyzer",
      },
      organizationId: {
        type: "keyword",
      },
      organizationName: {
        type: "keyword",
      },
      skillIds: {
        type: "keyword",
      },
      skillNames: {
        type: "keyword",
      },
      categoryIds: {
        type: "keyword",
      },
      categoryNames: {
        type: "keyword",
      },
      provinceId: {
        type: "keyword",
      },
      provinceName: {
        type: "keyword",
      },
      salaryMin: {
        type: "float",
      },
      salaryMax: {
        type: "float",
      },
      experienceMin: {
        type: "integer",
      },
      experienceMax: {
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
      createdAt: {
        type: "date",
      },
      updatedAt: {
        type: "date",
      },
      // Computed fields for scoring
      salaryAvg: {
        type: "float",
      },
      // Boost factor (can be updated based on job popularity, etc.)
      boost: {
        type: "float",
        default: 1.0,
      },
    },
  },
};

/**
 * Transform Job entity from PostgreSQL to Elasticsearch document
 */
export function transformJobToDocument(job: any): any {
  const salaryMin = job.salaryMin ? parseFloat(job.salaryMin) : null;
  const salaryMax = job.salaryMax ? parseFloat(job.salaryMax) : null;
  const salaryAvg = salaryMin && salaryMax ? (salaryMin + salaryMax) / 2 : null;

  return {
    id: job.id,
    title: job.title,
    description:
      typeof job.description === "string"
        ? job.description
        : JSON.stringify(job.description || {}),
    organizationId: job.organizationId,
    organizationName: job.organization?.name || null,
    skillIds: job.skills?.map((s: any) => s.id) || [],
    skillNames: job.skills?.map((s: any) => s.name) || [],
    categoryIds: job.categories?.map((c: any) => c.id) || [],
    categoryNames: job.categories?.map((c: any) => c.name) || [],
    provinceId: job.provinceId,
    provinceName: job.province?.name || null,
    salaryMin,
    salaryMax,
    salaryAvg,
    experienceMin: job.experienceMin,
    experienceMax: job.experienceMax,
    workType: job.workType,
    status: job.status,
    endDate: job.endDate,
    datePosted: job.datePosted,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    boost: 1.0, // Default boost, can be updated based on metrics
  };
}
