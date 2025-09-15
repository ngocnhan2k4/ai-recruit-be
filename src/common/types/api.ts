export interface GeneralController {
  getApiStatus: () => Promise<GeneralResponse>;
}

export interface GeneralResponse {
  status: "success" | "error";
  message: string;
}
