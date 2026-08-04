import { AsyncLocalStorage } from "async_hooks";

export const CONTEXT_KEYS = {
  REQUEST_LANGUAGE: "requestLanguage",
  FALLBACK_LANGUAGE: "fallbackLanguage",
  REQUEST_ID: "requestId",
  START_TIME: "startTime",
  AUDIT_DATA: "data",
  AUDIT_TARGET_ID: "targetId",
  AUDIT_ORGANIZATION_ID: "organizationId",
} as const;

const als = new AsyncLocalStorage<Map<string, unknown>>();

export const runContext = <T>(fn: () => T): T => als.run(new Map(), fn);

export const setContext = (key: string, value: unknown) =>
  als.getStore()?.set(key, value);

export const getContext = (key: string) => als.getStore()?.get(key);

export const getAllContext = () => als.getStore();
