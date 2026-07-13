import { AsyncLocalStorage } from "node:async_hooks";
import { DBDrizzleTransaction } from "@/frameworks/data-services/postgres/types";
import { CONTEXT_KEYS, getContext } from "../stores/context.store";
import { DEFAULT_LANGUAGE_CODE } from "../constants";

// [TODO]: refactor this to use the context store
type Store = {
  tx?: DBDrizzleTransaction;
};

export const txStorage = new AsyncLocalStorage<Store>();

export const getTx = () => txStorage.getStore()?.tx;

export const getRequestLanguage = (): string =>
  (getContext(CONTEXT_KEYS.REQUEST_LANGUAGE) as string | undefined) ??
  DEFAULT_LANGUAGE_CODE;

export const getExplicitRequestLanguage = (): string | undefined =>
  getContext(CONTEXT_KEYS.REQUEST_LANGUAGE) as string | undefined;

export const getFallbackLanguage = (): string =>
  (getContext(CONTEXT_KEYS.FALLBACK_LANGUAGE) as string | undefined) ??
  DEFAULT_LANGUAGE_CODE;
