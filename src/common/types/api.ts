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

export interface GeneralQuery {
  limit: number;
  cursor?: string;
  page?: number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  keyword?: string;
}
