import { randomUUID } from "crypto";

const SENSITIVE_KEY =
  /(password|passwd|secret|token|authorization|api[_-]?key|access[_-]?token|refresh[_-]?token|id[_-]?token|cookie|credential)/i;

const MAX_BODY_CHARS = 4000;
const MAX_STACK_CHARS = 8000;

/** Headers useful for debugging; others are skipped to reduce noise. */
const HEADER_ALLOWLIST = new Set([
  "host",
  "origin",
  "referer",
  "user-agent",
  "content-type",
  "content-length",
  "accept",
  "accept-language",
  "x-forwarded-for",
  "x-real-ip",
  "x-request-id",
  "authorization",
  "cookie",
]);

export const REQUEST_ID_HEADER = "x-request-id";

export function createRequestId(incoming?: string | string[]): string {
  const raw = Array.isArray(incoming) ? incoming[0] : incoming;
  const trimmed = raw?.trim();
  if (trimmed && trimmed.length <= 128) return trimmed;
  return randomUUID();
}

export function setResponseHeader(
  res: {
    header?: (name: string, value: string) => unknown;
    setHeader?: (name: string, value: string) => unknown;
  },
  name: string,
  value: string,
): void {
  if (typeof res.header === "function") {
    res.header(name, value);
    return;
  }
  if (typeof res.setHeader === "function") {
    res.setHeader(name, value);
  }
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…[truncated ${value.length - max} chars]`;
}

function redactValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEY.test(key)) {
    if (typeof value === "string") {
      return value.length === 0 ? "[EMPTY]" : `[REDACTED len=${value.length}]`;
    }
    return "[REDACTED]";
  }
  return value;
}

export function sanitizeForLog(value: unknown, depth = 0): unknown {
  if (value == null) return value;
  if (depth > 6) return "[MaxDepth]";
  if (typeof value === "string") return truncate(value, 1000);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "symbol") return value.description ?? "[Symbol]";
  if (typeof value === "function")
    return `[Function ${value.name || "anonymous"}]`;
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitizeForLog(item, depth + 1));
  }
  if (typeof value === "object") {
    // Avoid dumping streams / buffers / files
    if (Buffer.isBuffer(value)) return `[Buffer ${value.length} bytes]`;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeForLog(redactValue(k, v), depth + 1);
    }
    return out;
  }
  return "[Unserializable]";
}

export function serializeRequestPayload(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "object" && !Array.isArray(value)) {
    if (Object.keys(value).length === 0) return undefined;
  }
  try {
    return truncate(JSON.stringify(sanitizeForLog(value)), MAX_BODY_CHARS);
  } catch {
    return "[unserializable]";
  }
}

export function truncateStack(stack?: string): string | undefined {
  if (!stack) return undefined;
  return truncate(stack, MAX_STACK_CHARS);
}

export function serializeRequestHeaders(
  headers: Record<string, unknown> | undefined,
): string | undefined {
  if (!headers) return undefined;
  const picked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (!HEADER_ALLOWLIST.has(lower)) continue;
    picked[lower] = value;
  }
  return serializeRequestPayload(picked);
}

export function serializeRequestCookies(
  cookies: Record<string, unknown> | undefined,
): string | undefined {
  if (!cookies) return undefined;
  const names = Object.keys(cookies);
  if (names.length === 0) return undefined;

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(cookies)) {
    if (typeof value === "string") {
      out[key] = SENSITIVE_KEY.test(key)
        ? value.length === 0
          ? "[EMPTY]"
          : `[REDACTED len=${value.length}]`
        : truncate(value, 200);
    } else {
      out[key] = sanitizeForLog(redactValue(key, value));
    }
  }
  return serializeRequestPayload(out);
}

export type RequestLogSnapshot = {
  requestId: string;
  method: string;
  url: string;
  userId?: string;
  query?: string;
  params?: string;
  body?: string;
  headers?: string;
  cookies?: string;
};
