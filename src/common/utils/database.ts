import { Pool } from "pg";

const TIME_SLOW_QUERY_MS = 2000;

const formatSql = (sql: string, values: any[]) => {
  let formatted = sql;
  for (let idx = values.length - 1; idx >= 0; idx--) {
    const placeholder = `$${idx + 1}`;
    const val = values[idx];
    const formattedVal =
      typeof val === "string"
        ? `'${val.replace(/'/g, "''")}'`
        : val instanceof Date
          ? `'${val.toISOString()}'`
          : val;
    formatted = formatted.replaceAll(placeholder, String(formattedVal));
  }
  return formatted;
};

export const createLoggerQuery = (
  pool: Pool,
  options?: {
    logger: any;
  },
) => {
  const originalQuery = pool.query.bind(pool);
  const log = options?.logger || console;

  return (...args: any[]) => {
    const start = performance.now();
    const lastArg = args[args.length - 1];
    const hasCallback = typeof lastArg === "function";
    const sqlRaw =
      typeof args[0] === "string" ? args[0] : (args[0]?.text ?? "");
    const sql = formatSql(sqlRaw, args[1] || []);

    if (hasCallback) {
      const originalCallback = args[args.length - 1];
      args[args.length - 1] = (err: any, result: any) => {
        const duration = performance.now() - start;
        if (err) {
          log.error(`[SQL ERROR] ${duration.toFixed(2)}ms | Query: ${sql}`);
        } else if (duration > TIME_SLOW_QUERY_MS) {
          log.warn(`[SLOW SQL] ${duration.toFixed(2)}ms | Query: ${sql}`);
        }
        originalCallback(err, result);
      };
      return originalQuery(...args);
    }

    return originalQuery(...args)
      .then((result: any) => {
        const duration = performance.now() - start;
        if (duration > TIME_SLOW_QUERY_MS) {
          log.warn(`[SLOW SQL] ${duration.toFixed(2)}ms | Query: ${sql}`);
        }
        return result;
      })
      .catch((err: any) => {
        const duration = performance.now() - start;
        log.error(`[SQL ERROR] ${duration.toFixed(2)}ms | Query: ${sql}`);
        throw err;
      });
  };
};
