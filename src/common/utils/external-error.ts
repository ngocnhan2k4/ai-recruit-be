import { sanitizeForLog } from "./request-log";

const MAX_RESPONSE_CHARS = 2000;

type AxiosLikeError = {
  isAxiosError?: boolean;
  message?: string;
  code?: string;
  stack?: string;
  config?: {
    method?: string;
    url?: string;
    baseURL?: string;
    timeout?: number;
  };
  response?: {
    status?: number;
    statusText?: string;
    data?: unknown;
  };
  cause?: unknown;
};

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…[truncated ${value.length - max} chars]`;
}

function isAxiosLike(error: unknown): error is AxiosLikeError {
  if (!error || typeof error !== "object") return false;
  const e = error as AxiosLikeError;
  return (
    e.isAxiosError === true ||
    (typeof e.config?.url === "string" &&
      (e.response !== undefined || e.code !== undefined))
  );
}

function serializeResponseData(data: unknown): string | undefined {
  if (data == null) return undefined;
  try {
    if (typeof data === "string") return truncate(data, MAX_RESPONSE_CHARS);
    return truncate(JSON.stringify(sanitizeForLog(data)), MAX_RESPONSE_CHARS);
  } catch {
    return "[unserializable]";
  }
}

export function extractExternalErrorInfo(
  error: unknown,
): Record<string, unknown> | undefined {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current; depth++) {
    if (isAxiosLike(current)) {
      const method = current.config?.method?.toUpperCase();
      const url = current.config?.url
        ? `${current.config.baseURL ?? ""}${current.config.url}`
        : undefined;
      return {
        type: "http_client",
        message: current.message,
        code: current.code,
        method,
        url,
        timeout: current.config?.timeout,
        status: current.response?.status,
        statusText: current.response?.statusText,
        responseData: serializeResponseData(current.response?.data),
      };
    }

    if (current instanceof Error && current.cause) {
      current = current.cause;
      continue;
    }
    break;
  }
  return undefined;
}

/** Keep a readable message while preserving the original third-party error for tracing. */
export function wrapExternalError(message: string, cause: unknown): Error {
  return new Error(message, {
    cause: cause instanceof Error ? cause : undefined,
  });
}
