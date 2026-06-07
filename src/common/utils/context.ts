import { AsyncLocalStorage } from "node:async_hooks";
import { DBDrizzleTransaction } from "@/frameworks/data-services/postgres/types";

type Store = {
  tx?: DBDrizzleTransaction;
  requestLanguage?: string;
  fallbackLanguage?: string;
};

export const txStorage = new AsyncLocalStorage<Store>();

export const getTx = () => txStorage.getStore()?.tx;

export const getRequestLanguage = () => txStorage.getStore()?.requestLanguage;

export const getFallbackLanguage = () => txStorage.getStore()?.fallbackLanguage;

export const runWithContext = <T>(
  store: Partial<Store>,
  callback: () => T,
): T => {
  const currentStore = txStorage.getStore() ?? {};
  return txStorage.run({ ...currentStore, ...store }, callback);
};
