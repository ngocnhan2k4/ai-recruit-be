import { AsyncLocalStorage } from "async_hooks";

export const CONTEXT_KEYS = {
  REQUEST_LANGUAGE: "requestLanguage",
  FALLBACK_LANGUAGE: "fallbackLanguage",
} as const;

const als = new AsyncLocalStorage<Map<string, unknown>>();

export const runContext = <T>(fn: () => T): T => als.run(new Map(), fn);

export const setContext = (key: string, value: unknown) =>
  als.getStore()?.set(key, value);

export const getContext = (key: string) => als.getStore()?.get(key);

export const getAllContext = () => als.getStore();
