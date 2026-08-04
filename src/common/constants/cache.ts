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
    getWithDetail: (jobId: string, statuses = "all") =>
      `job:${jobId}:getWithDetail:statuses:${statuses}`,
    getWithDetailByUser: (jobId: string, userId: string, statuses = "all") =>
      `job:${jobId}:getWithDetail:user:${userId}:statuses:${statuses}`,
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
    getUserProfile: (userId: string) => `user:${userId}:getUserProfile`,
  },
  cv: {
    get: (cvId: string) => `cv:${cvId}:get`,
  },
  aiCv: {
    get: (aiCvId: string) => `aiCv:${aiCvId}:get`,
  },
  exchangeRate: {
    vndPerUsd: () => "exchange-rate:vnd-per-usd",
  },
  blog: {
    patternDetail: (postId: string) => `blog:${postId}:*`,
    patternSlugDetail: (slug: string) => `blog:slug:${slug}:*`,
    get: (postId: string) => `blog:${postId}:get`,
    getPostBaseById: (
      postId: string,
      requestLanguage = "vi",
      fallbackLanguage = "vi",
    ) =>
      `blog:${postId}:getPostBaseById:v2:${requestLanguage}:${fallbackLanguage}`,
    getPostBaseBySlug: (
      slug: string,
      requestLanguage = "vi",
      fallbackLanguage = "vi",
    ) =>
      `blog:slug:${slug}:getPostBaseBySlug:v2:${requestLanguage}:${fallbackLanguage}`,
    viewCount: (postId: string) => `blog:${postId}:view`,
    viewDirty: () => `blog:view:dirty`,
    topBlogs: () => `blog:top`,
    relatedPosts: (slug: string) => `blog:related:${slug}`,
  },
};
