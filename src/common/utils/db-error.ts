type PgErrorLike = {
  code?: string;
  detail?: string;
  hint?: string;
  constraint?: string;
  table?: string;
  column?: string;
  schema?: string;
  severity?: string;
  message?: string;
};

/** Generous limits so insert bind values remain visible in logs. */
const MAX_PARAM_CHARS = 12_000;
const MAX_QUERY_CHARS = 8_000;
const MAX_MESSAGE_CHARS = 4_000;

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…[truncated ${value.length - max} chars]`;
}

function safeParam(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string") return truncate(value, MAX_PARAM_CHARS);
  if (typeof value === "number" || typeof value === "boolean") return value;
  try {
    return truncate(JSON.stringify(value), MAX_PARAM_CHARS);
  } catch {
    return "[unserializable]";
  }
}

function asPgError(value: unknown): PgErrorLike | null {
  if (!value || typeof value !== "object") return null;
  const e = value as PgErrorLike;
  // SQLSTATE is 5 chars: digits and letters, e.g. 23503, 22P02
  if (typeof e.code === "string" && /^[0-9A-Z]{5}$/i.test(e.code)) return e;
  if (e.detail || e.constraint || e.table) return e;
  return null;
}

function unwrapDbError(error: unknown): {
  root: Error & { query?: string; params?: unknown[]; cause?: unknown };
  pg: PgErrorLike | null;
} {
  const root = (
    error && typeof error === "object" ? error : new Error(String(error))
  ) as Error & { query?: string; params?: unknown[]; cause?: unknown };

  const pg =
    asPgError(root.cause) ??
    asPgError(root) ??
    (root.cause && typeof root.cause === "object" && "cause" in root.cause
      ? asPgError((root.cause as { cause?: unknown }).cause)
      : null);

  return { root, pg };
}

/** True for Drizzle query failures (incl. cross-bundle instanceof misses). */
export function isDbQueryError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { name?: string; query?: unknown; params?: unknown };
  return (
    e.name === "DrizzleQueryError" ||
    (typeof e.query === "string" && Array.isArray(e.params))
  );
}

/** Structured fields for Drizzle / node-postgres query failures. */
export function extractDbErrorInfo(error: unknown): Record<string, unknown> {
  const { root, pg } = unwrapDbError(error);
  const rawMessage = root.message ?? "Database query failed";

  return {
    name: root.name,
    message: truncate(rawMessage, MAX_MESSAGE_CHARS),
    query:
      typeof root.query === "string"
        ? truncate(root.query, MAX_QUERY_CHARS)
        : undefined,
    // Bind values for $1, $2, ... — this is what was inserted/updated.
    params: Array.isArray(root.params) ? root.params.map(safeParam) : undefined,
    pg: pg
      ? {
          message: pg.message,
          code: pg.code,
          detail: pg.detail,
          hint: pg.hint,
          constraint: pg.constraint,
          table: pg.table,
          column: pg.column,
          schema: pg.schema,
          severity: pg.severity,
        }
      : undefined,
  };
}

/** Client-facing short message (prefer Postgres cause, never dump full SQL). */
export function formatDbErrorMessage(error: unknown): string {
  const { pg, root } = unwrapDbError(error);
  if (pg?.message) {
    const parts = [
      pg.message,
      pg.code ? `code=${pg.code}` : null,
      pg.constraint ? `constraint=${pg.constraint}` : null,
      pg.table ? `table=${pg.table}` : null,
      pg.column ? `column=${pg.column}` : null,
      pg.detail ? `detail=${pg.detail}` : null,
    ].filter(Boolean);
    return parts.join(" | ");
  }

  // Avoid returning truncated "Failed query: insert..." to clients.
  if (root.message?.startsWith("Failed query:")) {
    return "Database query failed";
  }
  return truncate(root.message || "Database query failed", MAX_MESSAGE_CHARS);
}
