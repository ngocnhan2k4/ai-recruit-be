export const SHORT_TTL = 10 * 60 * 1000; // 10 minutes
export const LONG_TTL = 60 * 60 * 1000; // 60 minutes
export const LLONG_TTL = 3 * 24 * 60 * 60 * 1000; // 3 days

export const CACHE_KEYS = {
  organization: {
    get: (orgId: string) => `org:${orgId}:get`,
    getWithDetail: (orgId: string) => `org:${orgId}:getById`,
  },
};
