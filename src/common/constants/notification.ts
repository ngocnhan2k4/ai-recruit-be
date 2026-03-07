export const ROOM_NOTIFICATIONS = {
  admin: "admin",
  org: ({ orgId }: { orgId: string }) => `org_${orgId}`,
  user: ({ userId, orgId }: { userId: string; orgId?: string }) =>
    `user_${userId}:${orgId ?? "none"}`,
};
