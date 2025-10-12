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
    cursor?: string | null;
    hasNextPage?: boolean;
    total?: number;
  };
}
