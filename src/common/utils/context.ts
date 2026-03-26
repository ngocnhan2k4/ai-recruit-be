import { AsyncLocalStorage } from "node:async_hooks";
import { DBDrizzleTransaction } from "@/frameworks/data-services/postgres/types";

type Store = {
  tx?: DBDrizzleTransaction;
};

export const txStorage = new AsyncLocalStorage<Store>();

export const getTx = () => txStorage.getStore()?.tx;
