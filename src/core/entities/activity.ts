import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { activities } from "@/frameworks/data-services/postgres/models/activity.model";
import { GeneralQuery } from "@/common/types";
import { ObjectType } from "./enum.entity";

export type AuditVisibility = "actor" | "org" | "admin_only";

export type Activity = InferSelectModel<typeof activities>;
export type NewActivity = InferInsertModel<typeof activities>;

export type ActivitySearchFilters = GeneralQuery & {
  targetType?: ObjectType;
  action?: string;
  createdBy?: string;
  organizationId?: string;
  targetId?: string;
  visibility?: AuditVisibility;
  actorOrTargetId?: string;
  from?: string;
  to?: string;
};
