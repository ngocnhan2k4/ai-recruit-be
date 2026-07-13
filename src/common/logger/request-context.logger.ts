import { ConsoleLogger, LogLevel } from "@nestjs/common";
import { getRequestId } from "../utils";

export class RequestContextLogger extends ConsoleLogger {
  private withRequestId(message: unknown): unknown {
    const requestId = getRequestId();
    if (!requestId) return message;

    if (typeof message === "string") {
      if (message.startsWith(`[${requestId}]`)) return message;
      return `[${requestId}] ${message}`;
    }

    return message;
  }

  protected formatMessage(
    logLevel: LogLevel,
    message: unknown,
    pidMessage: string,
    formattedLogLevel: string,
    contextMessage: string,
    timestampDiff: string,
  ): string {
    return super.formatMessage(
      logLevel,
      this.withRequestId(message),
      pidMessage,
      formattedLogLevel,
      contextMessage,
      timestampDiff,
    );
  }

  protected getJsonLogObject(
    message: unknown,
    options: {
      context: string;
      logLevel: LogLevel;
      writeStreamType?: "stdout" | "stderr";
      errorStack?: unknown;
    },
  ) {
    const base = super.getJsonLogObject(message, options);
    const requestId = getRequestId();
    return requestId ? { ...base, requestId } : base;
  }
}
