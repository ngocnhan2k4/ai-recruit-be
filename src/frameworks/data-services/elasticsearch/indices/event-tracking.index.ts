import { Environment } from "@/common/config";

export interface EventTrackingIndexConfig {
  env: Environment;
}

export function getEventTrackingIndexMapping({
  env,
}: EventTrackingIndexConfig) {
  return {
    settings: {
      number_of_shards:
        env === Environment.Local || env === Environment.Development ? 1 : 1,
      number_of_replicas:
        env === Environment.Local || env === Environment.Development ? 0 : 0,
    },
    mappings: {
      properties: {
        id: { type: "keyword" },
        recentJobs: {
          type: "nested",
          properties: {
            jobId: { type: "keyword" },
            eventType: { type: "keyword" },
          },
        },
        preferences: {
          properties: {
            lastCategories: { type: "keyword" },
            lastProvinces: { type: "keyword" },
            lastSalaryMin: { type: "double" },
          },
        },
        updatedAt: { type: "date" },
      },
    },
  };
}
