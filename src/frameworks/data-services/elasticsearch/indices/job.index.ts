import {
  Category,
  Job,
  OrganizationWithDetails,
  Province,
  Skill,
} from "@/core";

export const JOB_INDEX_NAME = "jobs";

export const jobIndexMapping = {
  settings: {
    number_of_shards: 3,
    number_of_replicas: 1,
    analysis: {
      analyzer: {
        vietnamese_analyzer: {
          type: "standard",
          // [TODO] Tích hợp Vietnamese tokenizer sau
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
      categoryId: {
        type: "keyword",
      },
      categoryName: {
        type: "keyword",
      },
      provinceIds: {
        type: "keyword",
      },
      provinceNames: {
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
      },
    },
  },
};

export function transformJobToDocument({
  job,
  skills,
  category,
  provinces,
  organization,
}: {
  job: Job;
  skills: Skill[];
  category: Category;
  provinces: Province[];
  organization: OrganizationWithDetails;
}): Record<string, unknown> {
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
    organizationName: organization?.name || null,
    skillIds: skills.map((s: Skill) => s.id).filter(Boolean),
    skillNames: skills.map((s: Skill) => s.name).filter(Boolean),
    categoryId: category.id,
    categoryName: category.name,
    provinceIds: provinces.map((p: Province) => p.id).filter(Boolean),
    provinceNames: provinces.map((p: Province) => p.name).filter(Boolean),
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
    boost: 1.0,
  };
}
