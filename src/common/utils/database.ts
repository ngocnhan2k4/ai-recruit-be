import { Pool, QueryResult, QueryConfig } from "pg";

const SLOW_QUERY_THRESHOLD_MS = 100;

export function createPoolLogger(pool: Pool): Pool {
  const originalQuery = pool.query.bind(pool);

  // Override pool.query với type-safe wrapper
  (pool as any).query = function (...args: any[]): any {
    const start = performance.now();
    let sql = "";
    let params: unknown[] = [];

    // Extract SQL và params
    if (args.length > 0) {
      const firstArg = args[0];
      if (typeof firstArg === "string") {
        sql = firstArg;
        params = (args[1] as unknown[]) || [];
      } else if (firstArg && typeof firstArg === "object") {
        const config = firstArg as QueryConfig;
        sql = config.text || "";
        // Drizzle pass params qua config.values
        params = (config.values as unknown[]) || [];

        // Debug: log nếu có SQL với $ nhưng params rỗng
        if (sql && sql.includes("$") && (!params || params.length === 0)) {
          console.log("[DEBUG] SQL có $ nhưng params rỗng");
          console.log("[DEBUG] Config keys:", Object.keys(config));
          console.log(
            "[DEBUG] Config:",
            JSON.stringify(config, null, 2).substring(0, 500),
          );
        }
      }
    }

    // Check if last argument is a callback
    const lastArg = args[args.length - 1];
    const hasCallback = typeof lastArg === "function";

    if (hasCallback) {
      // Callback style - wrap the callback
      const callback = lastArg;
      args[args.length - 1] = (err: Error | null, result: QueryResult) => {
        const duration = performance.now() - start;
        logQuery(sql, params, duration, err);
        callback(err, result);
      };
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return originalQuery(...args);
    } else {
      // Promise style
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result = originalQuery(...args);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      return result.then(
        (res: QueryResult) => {
          const duration = performance.now() - start;
          logQuery(sql, params, duration, null);
          return res;
        },
        (err: Error) => {
          const duration = performance.now() - start;
          logQuery(sql, params, duration, err);
          throw err;
        },
      );
    }
  };

  return pool;
}

function logQuery(
  sql: string,
  params: unknown[],
  duration: number,
  error: Error | null,
): void {
  const formattedSql = formatSql(sql, params);

  if (error) {
    console.error(
      `❌ Query failed (${duration.toFixed(1)}ms):\n${formattedSql}\nError: ${error.message}`,
    );
  } else if (duration > SLOW_QUERY_THRESHOLD_MS) {
    console.error(`🐌 Slow query (${duration.toFixed(1)}ms):\n${formattedSql}`);
  } else {
    console.log(`📊 Query (${duration.toFixed(1)}ms):\n${formattedSql}`);
  }
}

function formatSql(sql: string, params: unknown[]): string {
  if (!sql) return "[No SQL]";

  if (!params || params.length === 0) {
    // Debug: nếu có $ trong SQL nhưng không có params
    if (sql.includes("$")) {
      console.log(
        "[DEBUG formatSql] SQL có $ nhưng không có params:",
        sql.substring(0, 200),
      );
    }
    return sql;
  }

  let formatted = sql;

  params.forEach((param, index) => {
    let value: string;

    if (param === null || param === undefined) {
      value = "NULL";
    } else if (typeof param === "string") {
      // Escape single quotes và truncate nếu quá dài
      const escaped = param.replace(/'/g, "''");
      value =
        escaped.length > 100
          ? `'${escaped.substring(0, 100)}...'`
          : `'${escaped}'`;
    } else if (typeof param === "number" || typeof param === "boolean") {
      value = String(param);
    } else if (param instanceof Date) {
      value = `'${param.toISOString()}'`;
    } else if (Array.isArray(param)) {
      value = `ARRAY[${param
        .map((p) => (typeof p === "string" ? `'${p}'` : String(p)))
        .join(", ")}]`;
    } else if (typeof param === "object") {
      // JSON objects
      const json = JSON.stringify(param);
      value =
        json.length > 100
          ? `'${json.substring(0, 100)}...'::json`
          : `'${json}'::json`;
    } else {
      value = `'[${typeof param}]'`;
    }

    // Replace placeholder (global replace để handle reused params)
    formatted = formatted.replace(new RegExp(`\\$${index + 1}\\b`, "g"), value);
  });

  return formatted;
}
