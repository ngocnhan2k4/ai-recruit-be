import { ID } from "./db";

export interface GeneralController {
  getApiStatus: () => Promise<GeneralResponse>;
}

export interface GeneralResponse {
  status: "success" | "error";
  message: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    nextCursor?: string | number | null;
    hasNextPage?: boolean;
    total?: number;
  };
  /** Optional aggregates (e.g. Casbin policies tab: totals by ptype). */
  summary?: Record<string, number>;
}

export type SortDirection = "asc" | "desc";

export interface GeneralQuery {
  limit: number;
  cursor?: string;
  page?: number;
  sortBy?: string;
  sortDirection?: SortDirection;
  keyword?: string;
}

export interface RelatedEntity {
  id: ID;
  name: string;
}
