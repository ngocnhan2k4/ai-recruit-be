export const SHORT_TTL = 10 * 60 * 1000; // 10 minutes
export const LONG_TTL = 60 * 60 * 1000; // 60 minutes
export const LLONG_TTL = 3 * 24 * 60 * 60 * 1000; // 3 days
export const VERY_LONG_TTL = 10 * LLONG_TTL; // 30 days

export const CACHE_KEYS = {
  organization: {
    get: (orgId: string) => `org:${orgId}:get`,
    getWithDetail: (orgId: string) => `org:${orgId}:getWithDetail`,
    getNamesByType: (type: string) => `org:${type}:getNamesByType`,
  },
  job: {
    patternDetail: (jobId: string) => `job:${jobId}:*`,
    get: (jobId: string) => `job:${jobId}:get`,
    getWithDetail: (jobId: string) => `job:${jobId}:getWithDetail`,
    getWithDetailByUser: (jobId: string, userId: string) =>
      `job:${jobId}:getWithDetail:user:${userId}`,
  },
  skillSynonym: {
    getAll: () => `skillSynonym:getAll`,
  },
  skill: {
    getAll: () => `skill:getAll`,
  },
  subscription: {
    getFeatures: (subscriptionId: string) =>
      `sub:${subscriptionId}:getFeatures`,
  },
  user: {
    get: (userId: string) => `user:${userId}:get`,
  },
  cv: {
    get: (cvId: string) => `cv:${cvId}:get`,
  },
};
