import { Job } from "bullmq";
import {
  CONTEXT_KEYS,
  runContext,
  setContext,
} from "@/common/stores/context.store";
import { extractDbErrorInfo, isDbQueryError } from "@/common/utils/db-error";
import { extractExternalErrorInfo } from "@/common/utils/external-error";
import {
  serializeRequestPayload,
  truncateStack,
} from "@/common/utils/request-log";
import { getRequestId } from "./context";

export const QUEUE_REQUEST_ID_KEY = "requestId";

/** Attach current HTTP requestId (if any) onto queue job payload. */
export function withQueueTrace<T>(data: T): T {
  const requestId = getRequestId();
  if (!requestId) return data;

  if (data == null) {
    return { [QUEUE_REQUEST_ID_KEY]: requestId } as T;
  }

  if (typeof data !== "object" || Array.isArray(data)) {
    return {
      payload: data,
      [QUEUE_REQUEST_ID_KEY]: requestId,
    } as T;
  }

  const record = data as Record<string, unknown>;
  if (typeof record[QUEUE_REQUEST_ID_KEY] === "string") return data;
  return { ...record, [QUEUE_REQUEST_ID_KEY]: requestId } as T;
}

export function resolveJobRequestId(job: Job): string {
  const data = job.data as Record<string, unknown> | undefined;
  if (data && typeof data[QUEUE_REQUEST_ID_KEY] === "string") {
    return data[QUEUE_REQUEST_ID_KEY];
  }
  return `job:${job.queueName}:${job.id ?? "unknown"}`;
}

export async function runJobWithContext<T>(
  job: Job,
  fn: () => Promise<T>,
): Promise<T> {
  const requestId = resolveJobRequestId(job);
  return runContext(async () => {
    setContext(CONTEXT_KEYS.REQUEST_ID, requestId);
    return fn();
  });
}

export function formatWorkerErrorLog(
  worker: string,
  job: Job,
  error: unknown,
): string {
  return formatTrackedErrorLog({
    worker,
    requestId: getRequestId() || resolveJobRequestId(job),
    queue: job.queueName,
    jobId: job.id,
    jobName: job.name,
    attemptsMade: job.attemptsMade,
    data: job.data,
    error,
  });
}

export function formatTrackedErrorLog(params: {
  worker: string;
  requestId?: string;
  queue?: string;
  jobId?: string | number;
  jobName?: string;
  attemptsMade?: number;
  data?: unknown;
  error: unknown;
}): string {
  const requestId = params.requestId || getRequestId() || "-";
  const err = params.error as Error & { cause?: unknown };
  const payload = {
    requestId,
    worker: params.worker,
    queue: params.queue,
    jobId: params.jobId,
    jobName: params.jobName,
    attemptsMade: params.attemptsMade,
    data: serializeRequestPayload(params.data),
    message: err?.message || String(params.error),
    stack: truncateStack(err?.stack),
    causeStack: truncateStack(
      err?.cause instanceof Error ? err.cause.stack : undefined,
    ),
    ...(isDbQueryError(params.error) || isDbQueryError(err?.cause)
      ? {
          dbError: extractDbErrorInfo(
            isDbQueryError(params.error) ? params.error : err.cause,
          ),
        }
      : {}),
    ...(extractExternalErrorInfo(params.error)
      ? { externalError: extractExternalErrorInfo(params.error) }
      : {}),
  };

  return `[${params.worker}] job=${params.jobName ?? "-"}/${params.jobId ?? "-"} failed: ${payload.message} | ${JSON.stringify(payload)}`;
}
