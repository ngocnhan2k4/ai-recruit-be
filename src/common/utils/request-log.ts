import { randomUUID } from "crypto";

const MAX_BODY_CHARS = 4000;
const MAX_STACK_CHARS = 8000;
const MAX_HEADERS_CHARS = 20000;

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

/** Shallow clone for log — no redaction, keeps full string values. */
function cloneForRawLog(value: unknown, depth = 0): unknown {
  if (value == null) return value;
  if (depth > 6) return "[MaxDepth]";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "symbol") return value.description ?? "[Symbol]";
  if (typeof value === "function")
    return `[Function ${value.name || "anonymous"}]`;
  if (Array.isArray(value)) {
    return value.slice(0, 100).map((item) => cloneForRawLog(item, depth + 1));
  }
  if (typeof value === "object") {
    if (Buffer.isBuffer(value)) return `[Buffer ${value.length} bytes]`;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = cloneForRawLog(v, depth + 1);
    }
    return out;
  }
  return "[Unserializable]";
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
      out[k] = sanitizeForLog(v, depth + 1);
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

const USEFUL_HEADER_KEYS = new Set([
  "cookie",
  "authorization",
  "x-forwarded-for",
  "x-real-ip",
]);

const COOKIE_KEYS_TO_LOG = new Set(["token", "refreshtoken"]);

/** Parse raw Cookie header and keep only token / refreshToken. */
function pickCookiesFromHeader(
  cookieHeader: unknown,
): Record<string, unknown> | undefined {
  if (cookieHeader == null) return undefined;

  let raw: string;
  if (typeof cookieHeader === "string") {
    raw = cookieHeader;
  } else if (Array.isArray(cookieHeader)) {
    raw = cookieHeader
      .filter((part): part is string => typeof part === "string")
      .join("; ");
  } else {
    return undefined;
  }

  if (!raw.trim()) return undefined;

  const parsed: Record<string, unknown> = {};
  for (const part of raw.split(";")) {
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const name = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (COOKIE_KEYS_TO_LOG.has(name.toLowerCase())) {
      parsed[name] = value;
    }
  }
  return Object.keys(parsed).length > 0 ? parsed : undefined;
}

/** Log only Cookie (token + refreshToken), Authorization, and client IP headers. */
export function serializeRequestHeaders(
  headers: Record<string, unknown> | undefined,
): string | undefined {
  if (!headers) return undefined;
  try {
    const filtered: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(headers)) {
      const lower = key.toLowerCase();
      if (!USEFUL_HEADER_KEYS.has(lower) || value == null) continue;
      if (lower === "cookie") {
        const picked = pickCookiesFromHeader(value);
        if (picked) filtered.cookie = picked;
        continue;
      }
      filtered[key] = value;
    }
    if (Object.keys(filtered).length === 0) return undefined;
    return truncate(
      JSON.stringify(cloneForRawLog(filtered)),
      MAX_HEADERS_CHARS,
    );
  } catch {
    return "[unserializable]";
  }
}
